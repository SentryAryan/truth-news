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

const DEFAULT_LIMIT_PER_SOURCE = 5;

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

function resolveStatus(input: {
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

  let candidatesFound = 0;
  let candidatesRejected = 0;
  let duplicatesSkipped = 0;
  let detailPagesScraped = 0;
  let articlesInserted = 0;
  let articlesRejected = 0;
  let articlesFailed = 0;
  let rejectionReasons: Record<string, number> = {};
  const errors: string[] = [];

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
      errors.push(`${domain}: ${message}`);
      continue;
    }

    console.log(`[scrape] ${domain} — homepage fetched`);

    const { candidates: allLinks, rejectedNonArticle } = extractCandidateLinks(
      homepageHtml,
      source.listing_url,
      domain,
    );
    candidatesFound += allLinks.length;
    candidatesRejected += rejectedNonArticle;

    const existing = await getExistingOriginalUrls(allLinks);
    const fresh = allLinks.filter(
      (u) => !existing.has(u) && !existing.has(`${u}/`),
    );
    const dupCount = allLinks.length - fresh.length;
    duplicatesSkipped += dupCount;

    console.log(
      `[scrape] ${domain} — ${allLinks.length} candidates found, ${rejectedNonArticle} rejected (non-article), ${dupCount} duplicates`,
    );

    const toInsert: ArticleInsert[] = [];
    let sourceInserted = 0;
    let sourceRejected = 0;

    console.log(
      `[scrape] ${domain} — scraping up to ${limitPerSource} detail pages`,
    );

    for (const candidateUrl of fresh) {
      if (sourceInserted >= limitPerSource) {
        break;
      }

      try {
        const detailHtml = await scrapeUrl(candidateUrl);
        detailPagesScraped += 1;

        const parsed = parseArticlePage(detailHtml, candidateUrl);
        if (!parsed) {
          sourceRejected += 1;
          articlesRejected += 1;
          rejectionReasons = bumpReason(rejectionReasons, "parse_failed");
          continue;
        }

        const validation = validateParsedArticle(parsed, candidateUrl);
        if (!validation.valid) {
          sourceRejected += 1;
          articlesRejected += 1;
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
        sourceInserted += 1;
      } catch (err) {
        articlesFailed += 1;
        const message =
          err instanceof Error ? err.message : "detail scrape failed";
        errors.push(`${candidateUrl}: ${message}`);
        console.error(`[scrape] ${domain} — detail error: ${message}`);
      }
    }

    if (toInsert.length > 0) {
      try {
        const inserted = await insertArticles(toInsert);
        articlesInserted += inserted.length;
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
  }

  const totalDurationMs = Date.now() - started;
  const status = resolveStatus({
    articlesInserted,
    articlesFailed,
    errors,
    sourcesLength: sources.length,
  });

  const result: ScrapeResult = {
    status,
    logId: log.id,
    sourcesChecked: sources.length,
    candidatesFound,
    candidatesRejected,
    duplicatesSkipped,
    detailPagesScraped,
    articlesInserted,
    articlesRejected,
    articlesFailed,
    totalDurationMs,
    rejectionReasons,
    errors,
  };

  await completeLog(log.id, {
    status,
    sources_checked: sources.length,
    articles_found: candidatesFound,
    articles_inserted: articlesInserted,
    errors,
    metadata: {
      candidatesRejected,
      duplicatesSkipped,
      detailPagesScraped,
      articlesRejected,
      articlesFailed,
      totalDurationMs,
      rejectionReasons,
      limitPerSource,
    },
  });

  console.log("[scrape] summary", result);
  console.log(
    `[scrape] completed — status: ${status}, inserted: ${articlesInserted}, durationMs: ${totalDurationMs}`,
  );

  return result;
}
