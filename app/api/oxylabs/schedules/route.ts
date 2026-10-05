import { isValidAdminSecret } from "@/lib/auth/admin-secret";
import {
    applyScheduledPipeline,
    type SyncSummary,
} from "@/lib/oxylabs/sync-schedules";
import {
    emitPostHogPipelineLog,
    flushPostHogLogs,
} from "@/lib/posthog-logs";
import { listSchedules } from "@/lib/supabase/queries/schedules";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function syncStatus(result: SyncSummary): "success" | "partial_success" | "failed" {
  if (result.errors.length === 0) {
    return "success";
  }
  const progressed =
    result.created +
    result.reused +
    result.reactivated +
    result.replaced +
    result.deactivated +
    result.deactivatedOrphans;
  return progressed > 0 ? "partial_success" : "failed";
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schedules = await listSchedules();
    return NextResponse.json({ schedules });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load schedules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await applyScheduledPipeline();
    emitPostHogPipelineLog({
      event: "schedule_sync_completed",
      status: syncStatus(result),
      processedCount: result.created + result.reactivated + result.replaced,
      failedCount: result.errors.length,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Schedule sync failed";
    console.error("[scheduler] route error", message);
    emitPostHogPipelineLog({
      event: "schedule_sync_failed",
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      await flushPostHogLogs();
    } catch (err) {
      console.error("[scheduler] PostHog logs flush failed", err);
    }
  }
}
