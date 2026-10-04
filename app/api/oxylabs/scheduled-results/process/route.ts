import { isValidAdminSecret } from "@/lib/auth/admin-secret";
import { processScheduledResults } from "@/lib/pipeline/scheduled-results";
import {
    emitPostHogPipelineLog,
    flushPostHogLogs,
} from "@/lib/posthog-logs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processScheduledResults();
    emitPostHogPipelineLog({
      event: "scheduled_pipeline_completed",
      status: result.status,
      durationMs: result.totalDurationMs,
      processedCount: result.articlesInserted,
      failedCount: result.articlesFailed,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Scheduled processing failed";
    console.error("[scheduled] route error", message);
    emitPostHogPipelineLog({
      event: "scheduled_pipeline_failed",
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      await flushPostHogLogs();
    } catch (err) {
      console.error("[scheduled] PostHog logs flush failed", err);
    }
  }
}
