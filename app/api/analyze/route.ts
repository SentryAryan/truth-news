import { isValidAdminSecret } from "@/lib/auth/admin-secret";
import { runAnalysis } from "@/lib/pipeline/analyze";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    articleIds?: unknown;
    limit?: unknown;
  };

  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : undefined;

  const articleIds = Array.isArray(body.articleIds)
    ? body.articleIds.filter((id): id is string => typeof id === "string")
    : undefined;

  try {
    const result = await runAnalysis({ articleIds, limit });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[analyze] route error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
