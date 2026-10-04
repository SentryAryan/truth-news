import "server-only";

import {
    createSchedule,
    listScheduleIds,
    setScheduleActive,
} from "@/lib/oxylabs/scheduler-client";
import {
    insertSchedule,
    listSchedules,
    setScheduleRowActive,
} from "@/lib/supabase/queries/schedules";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import type { OxylabsSchedule, Source } from "@/lib/supabase/types";

export type SyncSummary = {
  sources: number;
  created: number;
  reused: number;
  reactivated: number;
  deactivated: number;
  deactivatedOrphans: number;
  scheduleIds: string[];
  errors: string[];
};

function storedBySource(
  rows: OxylabsSchedule[],
): Map<string, OxylabsSchedule> {
  return new Map(rows.map((row) => [row.source_id, row]));
}

async function ensureSourceSchedule(
  source: Source,
  existing: OxylabsSchedule | undefined,
): Promise<void> {
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
    return;
  }

  if (!existing.is_active) {
    await setScheduleActive(existing.oxylabs_schedule_id, true);
    await setScheduleRowActive(existing.id, true);
    console.log(
      `[scheduler] reactivated schedule ${existing.oxylabs_schedule_id} for ${source.name}`,
    );
    return;
  }

  console.log(
    `[scheduler] reused schedule ${existing.oxylabs_schedule_id} for ${source.name}`,
  );
}

function bump(
  summary: SyncSummary,
  field: "created" | "reused" | "reactivated" | "deactivated" | "deactivatedOrphans",
): SyncSummary {
  return { ...summary, [field]: summary[field] + 1 };
}

export async function syncSchedules(): Promise<SyncSummary> {
  const activeSources = await getActiveSources();
  console.log(
    `[scheduler] sync started — active sources: ${activeSources.length}`,
  );

  let summary: SyncSummary = {
    sources: activeSources.length,
    created: 0,
    reused: 0,
    reactivated: 0,
    deactivated: 0,
    deactivatedOrphans: 0,
    scheduleIds: [],
    errors: [],
  };

  const initialRows = await listSchedules();
  const bySource = storedBySource(initialRows);
  const activeSourceIds = new Set(activeSources.map((source) => source.id));

  for (const source of activeSources) {
    const existing = bySource.get(source.id);
    try {
      await ensureSourceSchedule(source, existing);
      if (!existing) {
        summary = bump(summary, "created");
      } else if (!existing.is_active) {
        summary = bump(summary, "reactivated");
      } else {
        summary = bump(summary, "reused");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "sync failed";
      console.error(`[scheduler] ${source.name} — ${message}`);
      summary = { ...summary, errors: [...summary.errors, `${source.name}: ${message}`] };
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
      const message = err instanceof Error ? err.message : "deactivate failed";
      console.error(`[scheduler] ${row.oxylabs_schedule_id} — ${message}`);
      summary = {
        ...summary,
        errors: [...summary.errors, `${row.oxylabs_schedule_id}: ${message}`],
      };
    }
  }

  const storedIds = new Set(
    (await listSchedules()).map((row) => row.oxylabs_schedule_id),
  );
  const remoteIds = await listScheduleIds();
  for (const remoteId of remoteIds) {
    if (storedIds.has(remoteId)) {
      continue;
    }
    try {
      await setScheduleActive(remoteId, false);
      summary = bump(summary, "deactivatedOrphans");
      console.log(`[scheduler] deactivated orphan schedule ${remoteId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "orphan deactivate failed";
      console.error(`[scheduler] orphan ${remoteId} — ${message}`);
      summary = {
        ...summary,
        errors: [...summary.errors, `orphan ${remoteId}: ${message}`],
      };
    }
  }

  const activeIds = (await listSchedules())
    .filter((row) => row.is_active)
    .map((row) => row.oxylabs_schedule_id);

  summary = { ...summary, scheduleIds: activeIds };
  console.log("[scheduler] sync summary", summary);
  return summary;
}
