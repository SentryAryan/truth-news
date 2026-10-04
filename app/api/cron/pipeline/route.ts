import { isCronRequestAuthorized } from "@/lib/auth/cron-secret";
import { runAnalysis, type AnalysisResult } from "@/lib/pipeline/analyze";
import { processScheduledResults } from "@/lib/pipeline/scheduled-results";
import type { ScrapeResult } from "@/lib/pipeline/scrape";
import {
    emitPostHogPipelineLog,
    flushPostHogLogs,
} from "@/lib/posthog-logs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function GET(req: NextRequest) {
  if (
    !isCronRequestAuthorized({
      authorizationHeader: req.headers.get("authorization"),
      cronSecret: process.env.CRON_SECRET,
      nodeEnv: process.env.NODE_ENV,
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processing: ScrapeResult | null = null;
  let processingError: string | null = null;
  try {
    processing = await processScheduledResults();
    emitPostHogPipelineLog({
      event: "scheduled_pipeline_completed",
      status: processing.status,
      durationMs: processing.totalDurationMs,
      processedCount: processing.articlesInserted,
      failedCount: processing.articlesFailed,
    });
  } catch (err) {
    processingError = errorMessage(err, "Scheduled processing failed");
    console.error("[cron/pipeline] processScheduledResults failed:", processingError);
    emitPostHogPipelineLog({
      event: "scheduled_pipeline_failed",
      status: "failed",
    });
  }

  let analysis: AnalysisResult | null = null;
  let analysisError: string | null = null;
  try {
    analysis = await runAnalysis();
    emitPostHogPipelineLog({
      event: "analysis_run_completed",
      status: analysis.status,
      durationMs: analysis.totalDurationMs,
      processedCount: analysis.analyzed,
      failedCount: analysis.failed,
    });
  } catch (err) {
    analysisError = errorMessage(err, "Analysis failed");
    console.error("[cron/pipeline] runAnalysis failed:", analysisError);
    emitPostHogPipelineLog({
      event: "analysis_run_failed",
      status: "failed",
    });
  }

  try {
    await flushPostHogLogs();
  } catch (err) {
    console.error("[cron/pipeline] PostHog logs flush failed", err);
  }

  return NextResponse.json({
    processing,
    processingError,
    analysis,
    analysisError,
  });
}
