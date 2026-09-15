import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Source } from "@/lib/supabase/types";

export async function getActiveSources(): Promise<Source[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`getActiveSources failed: ${error.message}`);
  }

  return data ?? [];
}
