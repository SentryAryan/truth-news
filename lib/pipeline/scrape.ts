import "server-only";

import { scrapeUrl } from "@/lib/pipeline/oxylabs";
import {
    domainFromListingUrl,
    extractCandidateLinks,
    parseArticlePage,
    validateParsedArticle,
} from "@/lib/pipeline/parse";
import {
    getExistingOriginalUrls,
    insertArticles,
} from "@/lib/supabase/queries/articles";
import { completeLog, createLog } from "@/lib/supabase/queries/logs";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import type { ArticleInsert, LogStatus, Source } from "@/lib/supabase/types";

export type ScrapeOptions = {
  sourceIds?: string[];
  limitPerSource?: number;
};

export type ScrapeResult = {
  status: LogStatus;
  logId: string;
  sourcesChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  totalDurationMs: number;
  rejectionReasons: Record<string, number>;
  errors: string[];
};

/** Counters produced by processing one homepage (manual or scheduled). */
export type SourceHomepageStats = {
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  rejectionReasons: Record<string, number>;
  errors: string[];
};

export const DEFAULT_LIMIT_PER_SOURCE = 5;

export function emptyHomepageStats(): SourceHomepageStats {
  return {
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
    rejectionReasons: {},
    errors: [],
  };
}

export function mergeHomepageStats(
  left: SourceHomepageStats,
  right: SourceHomepageStats,
): SourceHomepageStats {
  const rejectionReasons = { ...left.rejectionReasons };
  for (const [reason, count] of Object.entries(right.rejectionReasons)) {
    rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + count;
  }

  return {
    candidatesFound: left.candidatesFound + right.candidatesFound,
    candidatesRejected: left.candidatesRejected + right.candidatesRejected,
    duplicatesSkipped: left.duplicatesSkipped + right.duplicatesSkipped,
    detailPagesScraped: left.detailPagesScraped + right.detailPagesScraped,
    articlesInserted: left.articlesInserted + right.articlesInserted,
    articlesRejected: left.articlesRejected + right.articlesRejected,
    articlesFailed: left.articlesFailed + right.articlesFailed,
    rejectionReasons,
    errors: [...left.errors, ...right.errors],
  };
}

function bumpReason(
  reasons: Record<string, number>,
  reason: string,
): Record<string, number> {
  return {
    ...reasons,
    [reason]: (reasons[reason] ?? 0) + 1,
  };
}

function pickSources(
  all: Source[],
  sourceIds: string[] | undefined,
): Source[] {
  if (!sourceIds || sourceIds.length === 0) {
    return all;
  }
  const idSet = new Set(sourceIds);
  return all.filter((s) => idSet.has(s.id));
}

export function resolveScrapeStatus(input: {
  articlesInserted: number;
  articlesFailed: number;
  errors: string[];
  sourcesLength: number;
}): LogStatus {
  const { articlesInserted, articlesFailed, errors, sourcesLength } = input;
  if (sourcesLength === 0) {
    return "failed";
  }
  if (errors.length === 0 && articlesFailed === 0) {
    // Includes successful runs that inserted 0 because everything was duplicate.
    return "success";
  }
  if (articlesInserted > 0) {
    return "partial_success";
  }
  return "failed";
}

/**
 * Extract, dedupe, detail-scrape, validate, and insert from one homepage HTML
 * document. Callers fetch the HTML (live Oxylabs or a completed scheduled job).
 */
export async function processSourceHomepage(input: {
  source: Source;
  homepageHtml: string;
  limitPerSource: number;
}): Promise<SourceHomepageStats> {
  const { source, homepageHtml, limitPerSource } = input;
  const domain = domainFromListingUrl(source.listing_url);

  console.log(`[scrape] ${domain} — homepage fetched`);

  const { candidates: allLinks, rejectedNonArticle } = extractCandidateLinks(
    homepageHtml,
    source.listing_url,
    domain,
  );

  const existing = await getExistingOriginalUrls(allLinks);
  const fresh = allLinks.filter(
    (u) => !existing.has(u) && !existing.has(`${u}/`),
  );
  const dupCount = allLinks.length - fresh.length;

  console.log(
    `[scrape] ${domain} — ${allLinks.length} candidates found, ${rejectedNonArticle} rejected (non-article), ${dupCount} duplicates`,
  );

  const toInsert: ArticleInsert[] = [];
  let sourceRejected = 0;
  let detailPagesScraped = 0;
  let articlesFailed = 0;
  let rejectionReasons: Record<string, number> = {};
  const errors: string[] = [];

  console.log(
    `[scrape] ${domain} — scraping up to ${limitPerSource} detail pages`,
  );

  for (const candidateUrl of fresh) {
    if (toInsert.length >= limitPerSource) {
      break;
    }

    try {
      const detailHtml = await scrapeUrl(candidateUrl);
      detailPagesScraped += 1;

      const parsed = parseArticlePage(detailHtml, candidateUrl);
      if (!parsed) {
        sourceRejected += 1;
        rejectionReasons = bumpReason(rejectionReasons, "parse_failed");
        continue;
      }

      const validation = validateParsedArticle(parsed, candidateUrl);
      if (!validation.valid) {
        sourceRejected += 1;
        rejectionReasons = bumpReason(rejectionReasons, validation.reason);
        continue;
      }

      toInsert.push({
        source_id: source.id,
        original_url: parsed.originalUrl,
        canonical_url: parsed.canonicalUrl,
        title: parsed.title,
        image_url: parsed.imageUrl,
        published_at: parsed.publishedAt,
        raw_text: parsed.rawText,
      });
    } catch (err) {
      articlesFailed += 1;
      const message =
        err instanceof Error ? err.message : "detail scrape failed";
      errors.push(`${candidateUrl}: ${message}`);
      console.error(`[scrape] ${domain} — detail error: ${message}`);
    }
  }

  let articlesInserted = 0;
  if (toInsert.length > 0) {
    try {
      const inserted = await insertArticles(toInsert);
      articlesInserted = inserted.length;
      console.log(
        `[scrape] ${domain} — inserted ${inserted.length}, rejected ${sourceRejected}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "insertArticles failed";
      errors.push(`${domain}: ${message}`);
      articlesFailed += toInsert.length;
      console.error(`[scrape] ${domain} — insert error: ${message}`);
    }
  } else {
    console.log(
      `[scrape] ${domain} — inserted 0, rejected ${sourceRejected}`,
    );
  }

  return {
    candidatesFound: allLinks.length,
    candidatesRejected: rejectedNonArticle,
    duplicatesSkipped: dupCount,
    detailPagesScraped,
    articlesInserted,
    articlesRejected: sourceRejected,
    articlesFailed,
    rejectionReasons,
    errors,
  };
}

export async function finishScrapeRun(input: {
  logId: string;
  sourcesChecked: number;
  stats: SourceHomepageStats;
  extraErrors: string[];
  startedAt: number;
  limitPerSource: number;
}): Promise<ScrapeResult> {
  const errors = [...input.extraErrors, ...input.stats.errors];
  const totalDurationMs = Date.now() - input.startedAt;
  const status = resolveScrapeStatus({
    articlesInserted: input.stats.articlesInserted,
    articlesFailed: input.stats.articlesFailed,
    errors,
    sourcesLength: input.sourcesChecked,
  });

  const result: ScrapeResult = {
    status,
    logId: input.logId,
    sourcesChecked: input.sourcesChecked,
    candidatesFound: input.stats.candidatesFound,
    candidatesRejected: input.stats.candidatesRejected,
    duplicatesSkipped: input.stats.duplicatesSkipped,
    detailPagesScraped: input.stats.detailPagesScraped,
    articlesInserted: input.stats.articlesInserted,
    articlesRejected: input.stats.articlesRejected,
    articlesFailed: input.stats.articlesFailed,
    totalDurationMs,
    rejectionReasons: input.stats.rejectionReasons,
    errors,
  };

  await completeLog(input.logId, {
    status,
    sources_checked: input.sourcesChecked,
    articles_found: input.stats.candidatesFound,
    articles_inserted: input.stats.articlesInserted,
    errors,
    metadata: {
      candidatesRejected: input.stats.candidatesRejected,
      duplicatesSkipped: input.stats.duplicatesSkipped,
      detailPagesScraped: input.stats.detailPagesScraped,
      articlesRejected: input.stats.articlesRejected,
      articlesFailed: input.stats.articlesFailed,
      totalDurationMs,
      rejectionReasons: input.stats.rejectionReasons,
      limitPerSource: input.limitPerSource,
    },
  });

  console.log("[scrape] summary", result);
  console.log(
    `[scrape] completed — status: ${status}, inserted: ${result.articlesInserted}, durationMs: ${totalDurationMs}`,
  );

  return result;
}

/**
 * Full scrape-to-insert pipeline for active sources (AGENTS §9 / §16).
 */
export async function runScrape(
  opts: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const started = Date.now();
  const limitPerSource =
    typeof opts.limitPerSource === "number" && opts.limitPerSource > 0
      ? opts.limitPerSource
      : DEFAULT_LIMIT_PER_SOURCE;

  const allSources = await getActiveSources();
  const sources = pickSources(allSources, opts.sourceIds);

  console.log(
    `[scrape] started — sources: ${sources.length}, limitPerSource: ${limitPerSource}`,
  );

  const log = await createLog({
    log_type: "scrape",
    status: "running",
    sources_checked: 0,
    articles_found: 0,
    articles_inserted: 0,
  });

  let stats = emptyHomepageStats();
  const homepageErrors: string[] = [];

  for (const source of sources) {
    const domain = domainFromListingUrl(source.listing_url);
    console.log(`[scrape] ${domain} — fetching homepage`);

    let homepageHtml: string;
    try {
      homepageHtml = await scrapeUrl(source.listing_url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "homepage scrape failed";
      console.error(`[scrape] ${domain} — homepage error: ${message}`);
      homepageErrors.push(`${domain}: ${message}`);
      continue;
    }

    const sourceStats = await processSourceHomepage({
      source,
      homepageHtml,
      limitPerSource,
    });
    stats = mergeHomepageStats(stats, sourceStats);
  }

  return finishScrapeRun({
    logId: log.id,
    sourcesChecked: sources.length,
    stats,
    extraErrors: homepageErrors,
    startedAt: started,
    limitPerSource,
  });
}
