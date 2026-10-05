import "server-only";

import type { OxylabsScheduleRunInfo } from "@/lib/oxylabs/pick-run";
import {
    oxylabsIdToString,
    parseOxylabsJson,
} from "@/lib/oxylabs/safe-json";

const DATA_BASE = "https://data.oxylabs.io";

/**
 * 06:00 UTC daily. Hobby cron may fire any time in the 08:00 UTC hour,
 * so this homepage is finished before Vercel reads it.
 */
export const OXYLABS_DAILY_CRON = "0 6 * * *";
export const OXYLABS_SCHEDULE_END_TIME = "2035-12-31 23:59:59";

export type OxylabsScheduleInfo = {
  scheduleId: string;
  cron: string;
  active: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function authHeader(): string {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) {
    throw new Error("Missing OXY_WSA_USERNAME or OXY_WSA_PASSWORD");
  }
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${credentials}`;
}

async function dataRequest(
  path: string,
  init: { method: string; body?: string },
): Promise<{ status: number; raw: string }> {
  const res = await fetch(`${DATA_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: authHeader(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body,
    signal: AbortSignal.timeout(60_000),
  });
  const raw = await res.text();
  return { status: res.status, raw };
}

function assertOk(status: number, action: string): void {
  if (status < 200 || status >= 300) {
    throw new Error(`Oxylabs ${action} failed with ${status}`);
  }
}

export async function createSchedule(listingUrl: string): Promise<string> {
  const { status, raw } = await dataRequest("/v1/schedules", {
    method: "POST",
    body: JSON.stringify({
      cron: OXYLABS_DAILY_CRON,
      items: [{ source: "universal", url: listingUrl }],
      end_time: OXYLABS_SCHEDULE_END_TIME,
    }),
  });
  assertOk(status, "create schedule");

  const parsed = parseOxylabsJson(raw);
  if (!isRecord(parsed) || !("schedule_id" in parsed)) {
    throw new Error("Oxylabs create schedule response missing schedule_id");
  }
  return oxylabsIdToString(parsed.schedule_id);
}

export async function listScheduleIds(): Promise<string[]> {
  const { status, raw } = await dataRequest("/v1/schedules", { method: "GET" });
  assertOk(status, "list schedules");

  const parsed = parseOxylabsJson(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.schedules)) {
    throw new Error("Oxylabs list schedules response missing schedules");
  }
  return parsed.schedules.map((id) => oxylabsIdToString(id));
}

export async function getSchedule(
  scheduleId: string,
): Promise<OxylabsScheduleInfo> {
  const { status, raw } = await dataRequest(`/v1/schedules/${scheduleId}`, {
    method: "GET",
  });
  assertOk(status, "get schedule");

  const parsed = parseOxylabsJson(raw);
  if (
    !isRecord(parsed) ||
    typeof parsed.cron !== "string" ||
    typeof parsed.active !== "boolean"
  ) {
    throw new Error("Oxylabs get schedule response missing cron or active");
  }

  return {
    scheduleId: oxylabsIdToString(parsed.schedule_id),
    cron: parsed.cron,
    active: parsed.active,
  };
}

export async function getScheduleRuns(
  scheduleId: string,
): Promise<OxylabsScheduleRunInfo[]> {
  const { status, raw } = await dataRequest(
    `/v1/schedules/${scheduleId}/runs`,
    { method: "GET" },
  );
  assertOk(status, "list runs");

  const parsed = parseOxylabsJson(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.runs)) {
    throw new Error("Oxylabs runs response missing runs");
  }

  const runs: OxylabsScheduleRunInfo[] = [];
  for (const run of parsed.runs) {
    if (!isRecord(run) || !Array.isArray(run.jobs)) {
      continue;
    }
    const jobs = run.jobs.flatMap((job) => {
      if (!isRecord(job) || typeof job.result_status !== "string") {
        return [];
      }
      return [
        {
          id: oxylabsIdToString(job.id),
          resultStatus: job.result_status,
        },
      ];
    });
    runs.push({
      runId: oxylabsIdToString(run.run_id),
      jobs,
    });
  }
  return runs;
}

export async function fetchJobResultHtml(jobId: string): Promise<string | null> {
  const { status, raw } = await dataRequest(`/v1/queries/${jobId}/results`, {
    method: "GET",
  });
  if (status < 200 || status >= 300) {
    return null;
  }

  const parsed = parseOxylabsJson(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
    return null;
  }

  const first = parsed.results[0];
  if (!isRecord(first) || typeof first.content !== "string" || first.content.length === 0) {
    return null;
  }
  if (typeof first.status_code === "number" && first.status_code !== 200) {
    return null;
  }
  return first.content;
}

export async function setScheduleActive(
  scheduleId: string,
  active: boolean,
): Promise<void> {
  const { status } = await dataRequest(`/v1/schedules/${scheduleId}/state`, {
    method: "PUT",
    body: JSON.stringify({ active }),
  });
  assertOk(status, active ? "reactivate schedule" : "deactivate schedule");
}
