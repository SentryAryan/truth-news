import "server-only";

import { deriveBiasScore } from "@/lib/ai/analysis-schema";
import { embedArticle } from "@/lib/ai/embed-article";
import {
    ANALYSIS_MODEL_ID,
    getEmbeddingModelId,
} from "@/lib/ai/openrouter";
import { skippedAfterRateLimitAbort } from "@/lib/pipeline/analyze-accounting";
import { analyzeArticle } from "@/lib/pipeline/analyze-article";
import {
    updateArticleEmbedding,
    upsertArticleAnalysis,
} from "@/lib/supabase/queries/analyses";
import {
    getPendingAnalysisArticles,
    setArticleAnalyzedAt,
} from "@/lib/supabase/queries/articles";
import { completeLog, createLog } from "@/lib/supabase/queries/logs";
import type { ArticleWithAnalysis, LogStatus } from "@/lib/supabase/types";

export type AnalysisOptions = {
  articleIds?: string[];
  /**
   * Max articles to analyze this run.
   * Omit to use ANALYSIS_MAX_PER_RUN (default 20).
   */
  limit?: number;
};

export type AnalysisResult = {
  status: LogStatus;
  logId: string;
  pendingFound: number;
  analyzed: number;
  failed: number;
  skipped: number;
  totalDurationMs: number;
  errors: string[];
  abortedForRateLimit?: boolean;
};

function getBatchSize(): number {
  const raw = process.env.ANALYSIS_BATCH_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

/** Cap for how many pending articles one analyze run may process. */
function getMaxPerRun(): number {
  const raw = process.env.ANALYSIS_MAX_PER_RUN;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

function resolveStatus(analyzed: number, failed: number, errors: string[]): LogStatus {
  if (analyzed > 0 && failed === 0 && errors.length === 0) {
    return "success";
  }
  if (analyzed > 0) {
    return "partial_success";
  }
  if (failed > 0 || errors.length > 0) {
    return "failed";
  }
  return "success";
}

async function loadPendingBatch(
  batchSize: number,
  articleIds: string[] | undefined,
  excludeIds: Set<string>,
): Promise<ArticleWithAnalysis[]> {
  // Fetch extra rows so already-attempted ids in this run can be skipped
  // without stalling the while-loop on an empty filtered batch.
  const fetchLimit = Math.max(
    batchSize + excludeIds.size,
    articleIds?.length ?? 0,
    batchSize,
  );
  const pending = await getPendingAnalysisArticles(fetchLimit);

  const idFilter =
    articleIds && articleIds.length > 0 ? new Set(articleIds) : null;

  return pending
    .filter((a) => !excludeIds.has(a.id))
    .filter((a) => (idFilter ? idFilter.has(a.id) : true))
    .slice(0, batchSize);
}

/**
 * Process pending articles (missing analysis or missing embedding) via OpenRouter.
 * Sets analyzed_at only after both analysis and embedding are saved.
 * Aborts the rest of the run on the first OpenRouter rate-limit error.
 */
export async function runAnalysis(
  opts: AnalysisOptions = {},
): Promise<AnalysisResult> {
  const started = Date.now();
  const batchSize = getBatchSize();
  const envCap = getMaxPerRun();
  const maxTotal =
    typeof opts.limit === "number" && opts.limit > 0
      ? Math.min(opts.limit, envCap)
      : envCap;
  const embeddingModelId = getEmbeddingModelId();

  console.log(
    `[analyze] started — batchSize: ${batchSize}, maxPerRun: ${maxTotal}, model: ${ANALYSIS_MODEL_ID}, embedding: ${embeddingModelId}`,
  );

  const log = await createLog({
    log_type: "analysis",
    status: "running",
    articles_analyzed: 0,
  });

  let analyzed = 0;
  let failed = 0;
  let skipped = 0;
  let pendingFound = 0;
  let abortedForRateLimit = false;
  const errors: string[] = [];
  const seenIds = new Set<string>();

  outer: while (analyzed + failed < maxTotal) {
    const remaining = maxTotal - (analyzed + failed);
    const thisBatch = Math.min(batchSize, remaining);
    let batch: ArticleWithAnalysis[];

    try {
      batch = await loadPendingBatch(thisBatch, opts.articleIds, seenIds);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "failed to load pending articles";
      errors.push(message);
      console.error(`[analyze] ${message}`);
      break;
    }

    if (batch.length === 0) {
      break;
    }

    pendingFound += batch.length;
    console.log(`[analyze] batch of ${batch.length} articles`);

    for (let i = 0; i < batch.length; i += 1) {
      const article = batch[i]!;
      seenIds.add(article.id);

      if (analyzed + failed >= maxTotal) {
        skipped += 1;
        continue;
      }

      console.log(`[analyze] article ${article.id} — ${article.title.slice(0, 60)}`);

      try {
        const existingAnalysis = article.article_analyses;

        if (!existingAnalysis) {
          const analysisResult = await analyzeArticle({
            id: article.id,
            title: article.title,
            raw_text: article.raw_text,
          });

          if (!analysisResult.ok) {
            failed += 1;
            if (analysisResult.rateLimited) {
              const remainingSkipped = skippedAfterRateLimitAbort(
                batch.length,
                i,
              );
              skipped += remainingSkipped;
              errors.push(
                `${article.id}: OpenRouter rate limit — aborting remaining articles`,
              );
              abortedForRateLimit = true;
              console.error(
                `[analyze] rate limited — aborting remaining articles after ${article.id} (skipped: ${remainingSkipped})`,
              );
              break outer;
            }
            errors.push(
              `${article.id}: invalid or empty analysis after retry`,
            );
            continue;
          }

          const output = analysisResult.output;
          const biasScore = deriveBiasScore(
            output.left_percentage,
            output.right_percentage,
          );

          await upsertArticleAnalysis({
            article_id: article.id,
            summary: output.summary,
            sentiment_score: output.sentiment_score,
            sentiment_label: output.sentiment_label,
            bias_score: biasScore,
            bias_label: output.bias_label,
            left_percentage: output.left_percentage,
            center_percentage: output.center_percentage,
            right_percentage: output.right_percentage,
            confidence: output.confidence,
            framing_notes: output.framing_notes,
            loaded_terms: output.loaded_terms,
            disclaimer: output.disclaimer,
            model: ANALYSIS_MODEL_ID,
            embedding: null,
          });
          console.log(`[analyze] analysis saved ${article.id}`);
        } else {
          console.log(`[analyze] embedding backfill ${article.id}`);
        }

        const embedResult = await embedArticle(article.title, article.raw_text);
        if (!embedResult.ok) {
          failed += 1;
          if (embedResult.rateLimited) {
            const remainingSkipped = skippedAfterRateLimitAbort(
              batch.length,
              i,
            );
            skipped += remainingSkipped;
            errors.push(
              `${article.id}: OpenRouter rate limit on embedding — aborting remaining articles`,
            );
            abortedForRateLimit = true;
            console.error(
              `[analyze] rate limited on embed — aborting remaining articles after ${article.id} (skipped: ${remainingSkipped})`,
            );
            break outer;
          }
          errors.push(`${article.id}: embedding generation failed`);
          console.error(`[analyze] embedding failed ${article.id}`);
          continue;
        }

        await updateArticleEmbedding(article.id, embedResult.embedding);
        await setArticleAnalyzedAt(article.id, new Date().toISOString());
        analyzed += 1;
        console.log(`[analyze] embedding saved ${article.id}`);
      } catch (err) {
        failed += 1;
        const message =
          err instanceof Error ? err.message : "analyze/save failed";
        errors.push(`${article.id}: ${message}`);
        console.error(`[analyze] error ${article.id}: ${message}`);
      }
    }
  }

  const totalDurationMs = Date.now() - started;
  const status = resolveStatus(analyzed, failed, errors);

  const result: AnalysisResult = {
    status,
    logId: log.id,
    pendingFound,
    analyzed,
    failed,
    skipped,
    totalDurationMs,
    errors,
    ...(abortedForRateLimit ? { abortedForRateLimit: true } : {}),
  };

  await completeLog(log.id, {
    status,
    articles_analyzed: analyzed,
    errors,
    metadata: {
      pendingFound,
      failed,
      skipped,
      totalDurationMs,
      batchSize,
      maxPerRun: maxTotal,
      model: ANALYSIS_MODEL_ID,
      embeddingModel: embeddingModelId,
      abortedForRateLimit,
    },
  });

  console.log("[analyze] summary", result);
  console.log(
    `[analyze] completed — status: ${status}, analyzed: ${analyzed}, failed: ${failed}, skipped: ${skipped}, durationMs: ${totalDurationMs}${
      abortedForRateLimit ? ", abortedForRateLimit: true" : ""
    }`,
  );

  return result;
}
