import "server-only";

import { isScheduledPipelineEnabled } from "@/lib/oxylabs/pipeline-enabled";
import {
    createSchedule,
    getSchedule,
    listScheduleIds,
    OXYLABS_DAILY_CRON,
    setScheduleActive,
} from "@/lib/oxylabs/scheduler-client";
import {
    insertSchedule,
    listSchedules,
    setScheduleRowActive,
    updateScheduleOxylabsId,
} from "@/lib/supabase/queries/schedules";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import type { OxylabsSchedule, Source } from "@/lib/supabase/types";

export type SyncSummary = {
  sources: number;
  created: number;
  reused: number;
  reactivated: number;
  replaced: number;
  deactivated: number;
  deactivatedOrphans: number;
  scheduleIds: string[];
  errors: string[];
};

type EnsureResult = "created" | "reused" | "reactivated" | "replaced";

function storedBySource(
  rows: OxylabsSchedule[],
): Map<string, OxylabsSchedule> {
  return new Map(rows.map((row) => [row.source_id, row]));
}

function emptySummary(sources: number): SyncSummary {
  return {
    sources,
    created: 0,
    reused: 0,
    reactivated: 0,
    replaced: 0,
    deactivated: 0,
    deactivatedOrphans: 0,
    scheduleIds: [],
    errors: [],
  };
}

function bump(
  summary: SyncSummary,
  field: "created" | "reused" | "reactivated" | "replaced" | "deactivated" | "deactivatedOrphans",
): SyncSummary {
  return { ...summary, [field]: summary[field] + 1 };
}

function pushError(summary: SyncSummary, message: string): SyncSummary {
  return { ...summary, errors: [...summary.errors, message] };
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function replaceWithDailySchedule(
  source: Source,
  existing: OxylabsSchedule,
): Promise<void> {
  try {
    await setScheduleActive(existing.oxylabs_schedule_id, false);
  } catch (err) {
    console.error(
      `[scheduler] deactivate ${existing.oxylabs_schedule_id} before replace failed`,
      errorText(err, "deactivate failed"),
    );
  }

  const scheduleId = await createSchedule(source.listing_url);
  await updateScheduleOxylabsId(existing.id, scheduleId);
  console.log(
    `[scheduler] replaced ${existing.oxylabs_schedule_id} with ${scheduleId} for ${source.name}`,
  );
}

async function ensureSourceSchedule(
  source: Source,
  existing: OxylabsSchedule | undefined,
): Promise<EnsureResult> {
  if (!existing) {
    const scheduleId = await createSchedule(source.listing_url);
    await insertSchedule({
      source_id: source.id,
      oxylabs_schedule_id: scheduleId,
      is_active: true,
    });
    console.log(
      `[scheduler] created schedule ${scheduleId} for ${source.name}`,
    );
    return "created";
  }

  let cronMatches = false;
  let remoteActive = false;
  try {
    const remote = await getSchedule(existing.oxylabs_schedule_id);
    cronMatches = remote.cron === OXYLABS_DAILY_CRON;
    remoteActive = remote.active;
  } catch (err) {
    console.error(
      `[scheduler] get schedule ${existing.oxylabs_schedule_id} failed — replacing`,
      errorText(err, "get schedule failed"),
    );
  }

  if (!cronMatches) {
    await replaceWithDailySchedule(source, existing);
    return "replaced";
  }

  if (!remoteActive || !existing.is_active) {
    await setScheduleActive(existing.oxylabs_schedule_id, true);
    if (!existing.is_active) {
      await setScheduleRowActive(existing.id, true);
    }
    console.log(
      `[scheduler] reactivated schedule ${existing.oxylabs_schedule_id} for ${source.name}`,
    );
    return "reactivated";
  }

  console.log(
    `[scheduler] reused schedule ${existing.oxylabs_schedule_id} for ${source.name}`,
  );
  return "reused";
}

async function deactivateStoredAndOrphans(
  rows: OxylabsSchedule[],
): Promise<SyncSummary> {
  let summary = emptySummary(rows.length);

  for (const row of rows) {
    try {
      await setScheduleActive(row.oxylabs_schedule_id, false);
      if (row.is_active) {
        await setScheduleRowActive(row.id, false);
        summary = bump(summary, "deactivated");
        console.log(
          `[scheduler] deactivated schedule ${row.oxylabs_schedule_id}`,
        );
      }
    } catch (err) {
      const message = errorText(err, "deactivate failed");
      console.error(`[scheduler] ${row.oxylabs_schedule_id} — ${message}`);
      summary = pushError(summary, `${row.oxylabs_schedule_id}: ${message}`);
    }
  }

  const storedIds = new Set(rows.map((row) => row.oxylabs_schedule_id));
  return deactivateOrphans(summary, storedIds);
}

async function deactivateOrphans(
  summary: SyncSummary,
  storedIds: ReadonlySet<string>,
): Promise<SyncSummary> {
  let next = summary;
  const remoteIds = await listScheduleIds();
  for (const remoteId of remoteIds) {
    if (storedIds.has(remoteId)) {
      continue;
    }
    try {
      await setScheduleActive(remoteId, false);
      next = bump(next, "deactivatedOrphans");
      console.log(`[scheduler] deactivated orphan schedule ${remoteId}`);
    } catch (err) {
      const message = errorText(err, "orphan deactivate failed");
      console.error(`[scheduler] orphan ${remoteId} — ${message}`);
      next = pushError(next, `orphan ${remoteId}: ${message}`);
    }
  }
  return next;
}

export async function deactivateAllSchedules(): Promise<SyncSummary> {
  console.log("[scheduler] pipeline disabled — deactivating schedules");
  const rows = await listSchedules();
  const summary = await deactivateStoredAndOrphans(rows);
  console.log("[scheduler] sync summary", summary);
  return summary;
}

export async function syncSchedules(): Promise<SyncSummary> {
  const activeSources = await getActiveSources();
  console.log(
    `[scheduler] sync started — active sources: ${activeSources.length}, cron: ${OXYLABS_DAILY_CRON}`,
  );

  let summary = emptySummary(activeSources.length);
  const initialRows = await listSchedules();
  const bySource = storedBySource(initialRows);
  const activeSourceIds = new Set(activeSources.map((source) => source.id));

  for (const source of activeSources) {
    const existing = bySource.get(source.id);
    try {
      const result = await ensureSourceSchedule(source, existing);
      summary = bump(summary, result);
    } catch (err) {
      const message = errorText(err, "sync failed");
      console.error(`[scheduler] ${source.name} — ${message}`);
      summary = pushError(summary, `${source.name}: ${message}`);
    }
  }

  for (const row of initialRows) {
    if (activeSourceIds.has(row.source_id) || !row.is_active) {
      continue;
    }
    try {
      await setScheduleActive(row.oxylabs_schedule_id, false);
      await setScheduleRowActive(row.id, false);
      summary = bump(summary, "deactivated");
      console.log(
        `[scheduler] deactivated schedule ${row.oxylabs_schedule_id} — source inactive`,
      );
    } catch (err) {
      const message = errorText(err, "deactivate failed");
      console.error(`[scheduler] ${row.oxylabs_schedule_id} — ${message}`);
      summary = pushError(summary, `${row.oxylabs_schedule_id}: ${message}`);
    }
  }

  const storedIds = new Set(
    (await listSchedules()).map((row) => row.oxylabs_schedule_id),
  );
  summary = await deactivateOrphans(summary, storedIds);

  const activeIds = (await listSchedules())
    .filter((row) => row.is_active)
    .map((row) => row.oxylabs_schedule_id);

  summary = { ...summary, scheduleIds: activeIds };
  console.log("[scheduler] sync summary", summary);
  return summary;
}

export async function applyScheduledPipeline(): Promise<SyncSummary> {
  if (!isScheduledPipelineEnabled()) {
    return deactivateAllSchedules();
  }
  return syncSchedules();
}
