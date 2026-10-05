import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
    OxylabsSchedule,
    OxylabsScheduleInsert,
    OxylabsScheduleRun,
    OxylabsScheduleRunInsert,
} from "@/lib/supabase/types";

export async function listSchedules(): Promise<OxylabsSchedule[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`listSchedules failed: ${error.message}`);
  }

  return data ?? [];
}

export async function insertSchedule(
  row: OxylabsScheduleInsert,
): Promise<OxylabsSchedule> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`insertSchedule failed: ${error.message}`);
  }

  return data;
}

export async function updateScheduleOxylabsId(
  id: string,
  oxylabsScheduleId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("oxylabs_schedules")
    .update({ oxylabs_schedule_id: oxylabsScheduleId, is_active: true })
    .eq("id", id);

  if (error) {
    throw new Error(`updateScheduleOxylabsId failed: ${error.message}`);
  }
}

export async function setScheduleRowActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("oxylabs_schedules")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw new Error(`setScheduleRowActive failed: ${error.message}`);
  }
}

export async function listScheduleRuns(limit = 50): Promise<OxylabsScheduleRun[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`listScheduleRuns failed: ${error.message}`);
  }

  return data ?? [];
}

export async function insertScheduleRun(
  row: OxylabsScheduleRunInsert,
): Promise<OxylabsScheduleRun> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`insertScheduleRun failed: ${error.message}`);
  }

  return data;
}

/** schedule row id → Oxylabs run ids already stored. */
export async function listProcessedRunIds(): Promise<Map<string, Set<string>>> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .select("schedule_id, oxylabs_run_id");

  if (error) {
    throw new Error(`listProcessedRunIds failed: ${error.message}`);
  }

  const bySchedule = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!row.oxylabs_run_id) {
      continue;
    }
    const existing = bySchedule.get(row.schedule_id);
    if (existing) {
      existing.add(row.oxylabs_run_id);
    } else {
      bySchedule.set(row.schedule_id, new Set([row.oxylabs_run_id]));
    }
  }
  return bySchedule;
}
