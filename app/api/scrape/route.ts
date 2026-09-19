import { isValidAdminSecret } from "@/lib/auth/admin-secret";
import { runScrape } from "@/lib/pipeline/scrape";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sourceIds?: unknown;
    limitPerSource?: unknown;
  };

  const limitPerSource =
    typeof body.limitPerSource === "number" && body.limitPerSource > 0
      ? body.limitPerSource
      : 5;

  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.filter((id): id is string => typeof id === "string")
    : undefined;

  try {
    const result = await runScrape({ sourceIds, limitPerSource });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error("[scrape] route error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
