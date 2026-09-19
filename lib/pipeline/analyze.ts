import "server-only";

import { deriveBiasScore } from "@/lib/ai/analysis-schema";
import { ANALYSIS_MODEL_ID } from "@/lib/ai/openrouter";
import { analyzeArticle } from "@/lib/pipeline/analyze-article";
import { upsertArticleAnalysis } from "@/lib/supabase/queries/analyses";
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
): Promise<ArticleWithAnalysis[]> {
  const fetchLimit = articleIds?.length
    ? Math.max(articleIds.length, batchSize)
    : batchSize;
  const pending = await getPendingAnalysisArticles(fetchLimit);

  if (!articleIds || articleIds.length === 0) {
    return pending.slice(0, batchSize);
  }

  const idSet = new Set(articleIds);
  return pending.filter((a) => idSet.has(a.id)).slice(0, batchSize);
}

/**
 * Process pending articles (missing article_analyses) via OpenRouter.
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

  console.log(
    `[analyze] started — batchSize: ${batchSize}, maxPerRun: ${maxTotal}, model: ${ANALYSIS_MODEL_ID}`,
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
  const errors: string[] = [];
  const seenIds = new Set<string>();

  while (analyzed + failed < maxTotal) {
    const remaining = maxTotal - (analyzed + failed);
    const thisBatch = Math.min(batchSize, remaining);
    let batch: ArticleWithAnalysis[];

    try {
      batch = await loadPendingBatch(thisBatch, opts.articleIds);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "failed to load pending articles";
      errors.push(message);
      console.error(`[analyze] ${message}`);
      break;
    }

    // Filter out already-attempted ids in this run (defensive)
    batch = batch.filter((a) => !seenIds.has(a.id));
    if (batch.length === 0) {
      break;
    }

    pendingFound += batch.length;
    console.log(`[analyze] batch of ${batch.length} articles`);

    for (const article of batch) {
      seenIds.add(article.id);

      if (analyzed + failed >= maxTotal) {
        skipped += 1;
        continue;
      }

      console.log(`[analyze] article ${article.id} — ${article.title.slice(0, 60)}`);

      try {
        const output = await analyzeArticle({
          id: article.id,
          title: article.title,
          raw_text: article.raw_text,
        });

        if (!output) {
          failed += 1;
          errors.push(`${article.id}: invalid or empty analysis after retry`);
          continue;
        }

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
        });

        await setArticleAnalyzedAt(article.id, new Date().toISOString());
        analyzed += 1;
        console.log(`[analyze] saved ${article.id}`);
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
    },
  });

  console.log("[analyze] summary", result);
  console.log(
    `[analyze] completed — status: ${status}, analyzed: ${analyzed}, failed: ${failed}, durationMs: ${totalDurationMs}`,
  );

  return result;
}
