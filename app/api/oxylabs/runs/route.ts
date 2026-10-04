import { isValidAdminSecret } from "@/lib/auth/admin-secret";
import { listScheduleRuns } from "@/lib/supabase/queries/schedules";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runs = await listScheduleRuns();
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
