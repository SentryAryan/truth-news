import "server-only";

import { SeverityNumber } from "@opentelemetry/api-logs";

import { posthogLoggerProvider } from "@/instrumentation";
import type { LogStatus } from "@/lib/supabase/types";

type PipelineLog = {
  event: "analysis_run_completed" | "analysis_run_failed" | "scrape_run_completed" | "scrape_run_failed";
  status: LogStatus;
  durationMs?: number;
  processedCount?: number;
  failedCount?: number;
};

export function emitPostHogPipelineLog(log: PipelineLog) {
  const logger = posthogLoggerProvider?.getLogger("truth-news.posthog-export");
  if (!logger) {
    return;
  }

  logger.emit({
    body: log.event,
    severityNumber:
      log.status === "failed" ? SeverityNumber.ERROR : SeverityNumber.INFO,
    attributes: {
      event: log.event,
      status: log.status,
      ...(log.durationMs === undefined ? {} : { duration_ms: log.durationMs }),
      ...(log.processedCount === undefined
        ? {}
        : { processed_count: log.processedCount }),
      ...(log.failedCount === undefined ? {} : { failed_count: log.failedCount }),
    },
  });
}

export async function flushPostHogLogs() {
  await posthogLoggerProvider?.forceFlush();
}
