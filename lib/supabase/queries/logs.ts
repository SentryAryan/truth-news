import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Log, LogInsert, LogStatus, LogUpdate } from "@/lib/supabase/types";

export async function createLog(input: LogInsert): Promise<Log> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("logs")
    .insert({
      ...input,
      status: input.status ?? "running",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`createLog failed: ${error.message}`);
  }

  return data;
}

export async function completeLog(
  id: string,
  patch: LogUpdate & { status: LogStatus },
): Promise<Log> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("logs")
    .update({
      ...patch,
      finished_at: patch.finished_at ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`completeLog failed: ${error.message}`);
  }

  return data;
}
