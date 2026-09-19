import { isValidAdminSecret } from "@/lib/auth/admin-secret";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sources = await getActiveSources();
    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        listing_url: s.listing_url,
        parser_strategy: s.parser_strategy,
        is_active: s.is_active,
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load sources";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
