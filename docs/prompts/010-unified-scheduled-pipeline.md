# 010 — Unified Scheduled Pipeline (scrape + analyze in one call)

## Goal

`processScheduledResults()` currently only scrapes and inserts articles. `runAnalyze()` is called separately from the cron route. This means the manual process route (`POST /api/oxylabs/scheduled-results/process`) never triggers analysis, and the cron route has to chain two separate functions.

Consolidate into one: `processScheduledResults()` must call `runAnalyze()` internally after all sources finish, so every invocation — manual or automatic — runs the full pipeline end-to-end.

## Skills Read

- `.agents/skills/next-best-practices/SKILL.md` — server-only modules, route handlers

## Existing Code Inspected

- `lib/pipeline/scheduler.ts` — `processScheduledResults()`, `ProcessScheduledResultsResult` type
- `lib/pipeline/analyze.ts` — `runAnalyze()`, `AnalyzeResult` type — already handles all pending articles
- `app/api/cron/pipeline/route.ts` — currently calls processScheduledResults then runAnalyze separately
- `app/api/oxylabs/scheduled-results/process/route.ts` — calls only processScheduledResults, no analysis

## Decisions and Assumptions

1. `runAnalyze()` is called once at the end of `processScheduledResults()`, after all sources have been processed — not per-source. Calling it per-source would trigger redundant AI runs while scraping is still in progress.
2. `ProcessScheduledResultsResult` is extended to include an `analyzeResult` field so callers can see both scrape and analyze outcomes.
3. The cron route simplifies to a single `processScheduledResults()` call — no longer needs to call `runAnalyze()` separately.
4. The manual process route (`POST /api/oxylabs/scheduled-results/process`) stays unchanged in structure — it now also gets analysis for free since the pipeline function handles it.
5. If scraping found zero new articles, `runAnalyze()` still runs — there may be pre-existing unanalyzed articles from manual scrapes.
6. If `runAnalyze()` throws, log the error but do not fail the overall response — scrape results are already saved and valid.

## Files to Change

| File | Change |
|------|--------|
| `lib/pipeline/scheduler.ts` | Import `runAnalyze`. Call it after the source loop completes. Extend `ProcessScheduledResultsResult` with `analyzeResult`. |
| `app/api/cron/pipeline/route.ts` | Remove separate `runAnalyze()` call. Just call `processScheduledResults()` and return its result. |

`app/api/oxylabs/scheduled-results/process/route.ts` — no change needed, already calls `processScheduledResults()`.

## Implementation Requirements

### `lib/pipeline/scheduler.ts`

Update `ProcessScheduledResultsResult`:

```ts
export type ProcessScheduledResultsResult = {
  status: "success" | "partial_success" | "failed";
  schedulesProcessed: number;
  schedulesSkipped: number;
  articlesInserted: number;
  durationMs: number;
  analyzeResult: AnalyzeResult | { error: string };
};
```

At the end of `processScheduledResults()`, after the source loop and before returning the summary, add:

```ts
// Run AI analysis on all newly inserted (and any pre-existing) pending articles
let analyzeResult: AnalyzeResult | { error: string };
try {
  console.log("[scheduler] starting AI analysis on pending articles");
  analyzeResult = await runAnalyze();
} catch (err) {
  const message = err instanceof Error ? err.message : "analyze failed";
  console.error("[scheduler] runAnalyze failed:", message);
  analyzeResult = { error: message };
}
```

Include `analyzeResult` in the returned summary object.

### `app/api/cron/pipeline/route.ts`

Remove the separate `runAnalyze()` import and call. The handler becomes:

```ts
const result = await processScheduledResults();
return NextResponse.json(result);
```

Still keep the `CRON_SECRET` auth check and `maxDuration = 300`.

## Security Requirements

- No new secrets or credentials introduced.
- `runAnalyze` is already server-only; importing it into `scheduler.ts` (also server-only) is safe.

## Acceptance Criteria

- [ ] `POST /api/oxylabs/scheduled-results/process` triggers scraping + analysis in one call.
- [ ] `GET /api/cron/pipeline` triggers the same via `processScheduledResults()` — no separate `runAnalyze()` call.
- [ ] If no new articles were scraped, analysis still runs on any pre-existing pending articles.
- [ ] If `runAnalyze()` throws, the response still includes the scrape result — not a 500.
- [ ] `ProcessScheduledResultsResult` includes `analyzeResult`.
- [ ] TypeScript compiles clean.

## Checks to Run

```bash
npx tsc --noEmit
```

## Manual Test Steps

```bash
npm run dev

# Trigger the full pipeline manually
curl -X POST "http://localhost:3000/api/oxylabs/scheduled-results/process" \
  -H "content-type: application/json" \
  -H "x-biasly-admin-secret: your-secret" \
  -d '{}'
```

Watch the terminal for `[scheduler]` logs followed by `[analyze]` logs in the same request. The response JSON should include both `schedulesProcessed`, `articlesInserted`, and `analyzeResult`.
