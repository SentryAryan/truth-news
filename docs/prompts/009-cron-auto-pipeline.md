# 009 — Automatic Hourly Pipeline via Vercel Cron

## Goal

After the Oxylabs Scheduler fires each hour and scrapes source homepages, the app must automatically:

1. Fetch completed Oxylabs job results, extract article links, scrape article detail pages, and insert valid articles (`processScheduledResults`)
2. Immediately run AI analysis on all newly inserted (unanalyzed) articles (`runAnalyze`)

This removes the need to manually call `POST /api/oxylabs/scheduled-results/process` and `POST /api/analyze` after each Oxylabs run.

## Mechanism: Vercel Cron Jobs

Vercel Cron Jobs trigger a GET request to a route handler on a cron schedule. The request includes `Authorization: Bearer <CRON_SECRET>` (automatically injected by Vercel). This is the standard Next.js approach for scheduled background work — no extra infrastructure, no Trigger.dev.

The Oxylabs schedule fires at `0 * * * *` (top of every hour). We run our processing cron 15 minutes later at `15 * * * *` to give Oxylabs time to complete its jobs.

## Skills Read

- `.agents/skills/next-best-practices/SKILL.md` — route handlers, runtime selection

## Existing Code Inspected

- `lib/pipeline/scheduler.ts` — `processScheduledResults()` — fetches Oxylabs results, scrapes articles, inserts valid ones
- `lib/pipeline/analyze.ts` — `runAnalyze()` — processes all pending unanalyzed articles, batched
- `app/api/oxylabs/schedules/route.ts` — pattern for admin-protected route handlers
- `next.config.ts` — no special runtime set; Node.js default applies

## Decisions and Assumptions

1. **Single cron route** at `GET /api/cron/pipeline` chains `processScheduledResults()` then `runAnalyze()`. One route, one cron entry — simpler.
2. **15-minute offset**: Oxylabs runs at `:00`, our cron runs at `:15` — gives Oxylabs ~15 min to complete jobs.
3. **Vercel `CRON_SECRET` auth**: Vercel injects `Authorization: Bearer <CRON_SECRET>` on every cron request. The route validates this. Reject any request missing or with wrong auth with `401`. In local dev, `CRON_SECRET` is not set by Vercel — allow the route to skip auth when `NODE_ENV === 'development'` so it can be hit manually with a simple curl during testing.
4. **No duplicate analysis logic**: `runAnalyze()` already processes all pending unanalyzed articles by default. No changes needed to the analyze pipeline.
5. **`vercel.json`**: Create at the project root with `crons` array. One entry: path `/api/cron/pipeline`, schedule `15 * * * *`.
6. **Response**: Return JSON summary of both pipeline steps: `{ scrape: ScrapeResult, analyze: AnalyzeResult }`. If scraping fails entirely, still attempt analyze (there may be pre-existing unanalyzed articles). Catch each step independently.
7. **No `BIASLY_ADMIN_SECRET` on cron route**: The cron route is server-internal only, protected by `CRON_SECRET`. It is not a public pipeline action endpoint. The existing manual routes (`/api/oxylabs/scheduled-results/process`, `/api/analyze`) remain unchanged and still require `x-biasly-admin-secret`.
8. **`maxDuration`**: Set `export const maxDuration = 300` on the route (5 minutes) — the combined pipeline can take time. Vercel Hobby plan allows up to 60s, Pro allows up to 300s. Export it anyway; it's a no-op if the plan doesn't support it but avoids a timeout on Pro.

## Files to Create / Change

| File | Change |
|------|--------|
| `vercel.json` | New: cron config — `GET /api/cron/pipeline` at `15 * * * *` |
| `app/api/cron/pipeline/route.ts` | New: GET handler, `CRON_SECRET` auth, chains processScheduledResults → runAnalyze |

No other files change.

## Implementation Requirements

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/pipeline",
      "schedule": "15 * * * *"
    }
  ]
}
```

### `app/api/cron/pipeline/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { processScheduledResults } from "@/lib/pipeline/scheduler";
import { runAnalyze } from "@/lib/pipeline/analyze";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (skip in dev for manual testing)
  if (process.env.NODE_ENV !== "development") {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let scrapeResult: unknown = null;
  let analyzeResult: unknown = null;

  // Step 1: Process scheduled results
  try {
    scrapeResult = await processScheduledResults();
  } catch (err) {
    const message = err instanceof Error ? err.message : "scrape failed";
    console.error("[cron/pipeline] processScheduledResults failed:", message);
    scrapeResult = { error: message };
  }

  // Step 2: Analyze all pending articles (runs regardless of scrape outcome)
  try {
    analyzeResult = await runAnalyze();
  } catch (err) {
    const message = err instanceof Error ? err.message : "analyze failed";
    console.error("[cron/pipeline] runAnalyze failed:", message);
    analyzeResult = { error: message };
  }

  return NextResponse.json({ scrape: scrapeResult, analyze: analyzeResult });
}
```

## Security Requirements

- In production: require `Authorization: Bearer <CRON_SECRET>` — reject with 401 otherwise.
- In development: skip auth so the route can be tested with a plain curl.
- `CRON_SECRET` is set automatically by Vercel — no need to add it to `.env.local`.
- Route must not expose `BIASLY_ADMIN_SECRET`, Supabase service key, or Oxylabs credentials — it imports only pipeline functions that are server-only modules.

## Acceptance Criteria

- [ ] `vercel.json` created with cron entry for `/api/cron/pipeline` at `15 * * * *`.
- [ ] `GET /api/cron/pipeline` runs `processScheduledResults()` then `runAnalyze()` and returns combined JSON.
- [ ] In production, requests without valid `Authorization: Bearer <CRON_SECRET>` get 401.
- [ ] If `processScheduledResults` throws, the route still runs `runAnalyze` and returns partial result.
- [ ] TypeScript compiles clean.

## Checks to Run

```bash
npx tsc --noEmit
```

## Manual Test Steps

In dev (auth is skipped):

```bash
# Start dev server first
npm run dev

# Trigger the combined pipeline manually
curl http://localhost:3000/api/cron/pipeline
```

Watch the terminal for `[scheduler]` and `[analyze]` log output. On Vercel, the cron fires automatically at `:15` every hour.
