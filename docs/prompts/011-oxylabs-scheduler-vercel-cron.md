# 011 — Oxylabs Scheduler + Vercel Cron (automatic hourly pipeline)

## Goal

Make biasly scrape and analyze news automatically every hour with zero manual
intervention, by:

1. Creating one **Oxylabs Scheduler** schedule per active source homepage (hourly).
2. Processing the **completed scheduled job results** through the *same* validation,
   cleanup, dedupe, and console-summary logic as manual scraping.
3. Chaining **scheduled-result processing → AI analysis** behind a single
   **Vercel Cron** route that fires at `:15` past every hour.

This is the section 18 feature in `AGENTS.md`. Deliver **all parts together**.

## Skills read

- `.agents/skills/oxylabs-web-scraper/SKILL.md` — Web Scraper API auth, `universal`
  source, `render: html`, response shape.
- `.agents/skills/supabase/SKILL.md` — service-role writes, `.in()` chunking, joined
  filter gotcha (filter in JS, not `.eq('foreignTable.col')`).
- `.agents/skills/next-best-practices/SKILL.md` — thin route handlers, Node runtime,
  server-only modules, `'use server'`/`server-only` boundaries.

## Live docs consulted (required by the Oxylabs skill — do NOT trust memory)

Fetched at prompt time; re-verify at implementation time:

- Scheduler: `https://developers.oxylabs.io/products/web-scraper-api/features/scheduler`
- Push-Pull results: `https://developers.oxylabs.io/products/web-scraper-api/integration-methods/push-pull`

Confirmed facts that drive the implementation:

- **Scheduler + job results live on `https://data.oxylabs.io`** (the push-pull host),
  NOT the `realtime.oxylabs.io` host that `lib/scraping/oxylabs.ts` uses for manual
  scraping. Same Basic-Auth credentials (`OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD`).
- `POST /v1/schedules` body: `{ cron, items: [...job params], end_time }`. Returns
  `{ schedule_id, active, items_count, cron, end_time, next_run_at }`. POST returns
  **202**.
- `GET /v1/schedules` → `{ "schedules": [<64-bit int>, ...] }`.
- `GET /v1/schedules/{id}/runs` → `{ runs: [{ run_id, success_rate, jobs: [{ id,
  create_status_code, result_status, created_at, result_created_at }] }] }`.
  `result_status` is `"done" | "pending" | "faulted"`.
- `GET /v1/schedules/{id}/jobs` → only a flat array of ids, **no status** → not usable
  for processing. Use `/runs`.
- `PUT /v1/schedules/{id}/state` body `{ active: false }` → 202, returns null.
- Fetch a finished job's HTML: `GET /v1/queries/{job_id}/results?type=raw` →
  `{ results: [{ content, status_code, url, ... }] }`. `content` is the homepage HTML.

### CRITICAL — large 64-bit integer precision

`schedule_id` and job `id` exceed `Number.MAX_SAFE_INTEGER`. `JSON.parse` silently
corrupts the last digits. **Read these IDs from the raw HTTP response text with regex
BEFORE any `JSON.parse`.** Never `String(parsedNumber)`. This applies to:

- the `schedule_id` from `POST /v1/schedules`,
- the id list from `GET /v1/schedules`,
- each job `id` + its `result_status` from `GET /v1/schedules/{id}/runs`.

`content` from `/results` is a string and safe to `JSON.parse`.

## Existing code inspected

- `lib/scraping/pipeline.ts` — `runScrapePipeline`, `ScrapeSummary`, `getExistingUrls`
  (15-URL `.in()` chunking), per-source loop, console summary. **Refactor target.**
- `lib/scraping/oxylabs.ts` — `scrapeUrl` (realtime host) — leave as-is, reuse for
  detail-page scraping.
- `lib/scraping/extractor.ts`, `filter.ts`, `validator.ts` — homepage link extraction,
  candidate URL filtering, article validation/cleanup. **Reuse unchanged.**
- `lib/ai/pipeline.ts` — `runAnalysisPipeline` (LEFT-JOIN pending detection,
  embeddings). **Reuse unchanged** for step two of the cron.
- `lib/supabase/service.ts` — `getServiceClient`.
- `lib/supabase/queries/sources.ts` — `getActiveSources`.
- `lib/supabase/types.ts` + `supabase/schema.sql` — `oxylabs_schedules` and
  `oxylabs_schedule_runs` tables **already exist**. **No schema change needed.**
- `app/api/scrape/route.ts`, `app/api/analyze/route.ts` — admin-secret pattern to copy.

## Decisions / assumptions

1. **No schema or types change.** Both scheduler tables already exist in
   `schema.sql` and `lib/supabase/types.ts`.
2. **One schedule per source.** Each Oxylabs schedule's `items` is a single
   `{ source: 'universal', url: <source.listing_url>, render: 'html' }`. This lets us
   map every job in a schedule back to one source via the `oxylabs_schedules` row — no
   URL-to-source guessing.
3. **Oxylabs cron** = `0 * * * *` (top of every hour). **Vercel cron** = `15 * * * *`
   (15 min later, per section 18). `end_time` set far in the future
   (`2035-12-31 00:00:00`).
4. **Shared core, no duplication.** Refactor `pipeline.ts` to expose a reusable
   per-source processor that both manual scrape and scheduled processing call, so
   validation/cleanup/dedupe/logging/summary are identical (section 18 requirement).
5. **Sync replaces DB rows then deactivates orphans.** Each sync deletes existing
   `oxylabs_schedules` rows, creates fresh schedules, inserts new rows, then lists all
   Oxylabs schedule ids and deactivates any not in the new DB set (section 18 orphan
   rule). Deleting schedule rows cascade-clears their `oxylabs_schedule_runs` history;
   that history is informational only — acceptable.
6. **Credentials reused.** Scheduler/results use the existing
   `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD`; no new Oxylabs env vars.
7. **Cron auth.** `/api/cron/pipeline` is GET (Vercel always sends GET), protected by
   `CRON_SECRET` via the `Authorization: Bearer <CRON_SECRET>` header Vercel injects.
   In dev (`NODE_ENV !== 'production'`) the check is skipped. `CRON_SECRET` is **not**
   added to `.env.local`; documented as a comment in `.env.example` only.
8. **Default scope** = all active sources, up to 5 valid articles per source (matches
   manual scrape default).

## Files likely to change / add

**Refactor**
- `lib/scraping/pipeline.ts` — extract and export:
  - `createEmptySummary(): ScrapeSummary`
  - `getExistingUrls(urls): Promise<Set<string>>` (export existing)
  - `processSourceHomepage({ source, homepageHtml, limit, summary, bumpReason }): Promise<number>`
    containing current steps 2–7 (extract → filter → dedupe → detail scrape → validate
    → insert). `runScrapePipeline` calls `scrapeUrl(homepage)` then this; behavior and
    logs unchanged.

**New — Oxylabs scheduler client** `lib/oxylabs/scheduler.ts` (`import 'server-only'`)
- `createSchedule(items, cron, endTime): Promise<string>` — POST, regex `schedule_id`
  from raw text.
- `listScheduleIds(): Promise<string[]>` — GET, regex all ids from raw text.
- `getDoneJobIds(scheduleId): Promise<string[]>` — GET `/runs`, regex each job `id` +
  `result_status` from raw text, keep `result_status === 'done'` (latest run only).
- `fetchJobResultHtml(jobId): Promise<string | null>` — GET `/results?type=raw`,
  `JSON.parse`, return `results[0].content` (status 200) else null.
- `setScheduleState(scheduleId, active): Promise<void>` — PUT `/state`.
- Private `dataAuthHeader()` Basic-Auth helper; throws if creds missing.

**New — sync orchestration** `lib/oxylabs/sync.ts` (`server-only`)
- `syncSchedules(): Promise<SyncSummary>` — load active sources; delete existing
  `oxylabs_schedules` rows; per source create schedule + insert row; list Oxylabs ids;
  deactivate orphans; return `{ sources, created, deactivated_orphans, schedule_ids }`.
  Neat console logs throughout.

**New — scheduled-result processing** `lib/scraping/scheduled-pipeline.ts` (`server-only`)
- `processScheduledResults(): Promise<ScrapeSummary>` — build a `ScrapeSummary` via
  `createEmptySummary()`; for each `oxylabs_schedules` row load its source, get done job
  ids, fetch each job's homepage HTML, run `processSourceHomepage(...)`; insert an
  `oxylabs_schedule_runs` row per schedule (`status`, `articles_inserted`, `summary`);
  log the same per-source lines and final summary object as manual scrape.

**New — routes (thin handlers only)**
- `app/api/oxylabs/schedules/route.ts`
  - `POST` → admin-secret guard → `syncSchedules()` → JSON summary.
  - `GET` → read `oxylabs_schedules` rows → JSON (no mutation, no secret).
- `app/api/oxylabs/runs/route.ts`
  - `GET` → read recent `oxylabs_schedule_runs` rows → JSON.
- `app/api/oxylabs/scheduled-results/process/route.ts`
  - `POST` → admin-secret guard → `processScheduledResults()` → JSON summary.
- `app/api/cron/pipeline/route.ts`
  - `GET` → `CRON_SECRET` Bearer guard (skipped in dev) → run
    `processScheduledResults()`; then **always** run `runAnalysisPipeline()` even if
    step one threw (there may be pre-existing unanalyzed articles); return both
    summaries. `export const runtime = 'nodejs'` and `export const maxDuration = 300`.

**New — Vercel cron config** `vercel.json`
```json
{ "crons": [{ "path": "/api/cron/pipeline", "schedule": "15 * * * *" }] }
```

**Docs**
- `.env.example` — add commented note that Vercel injects `CRON_SECRET` automatically;
  do not set it in `.env.local`.

## Implementation requirements

- All Oxylabs/OpenAI/Supabase-service calls stay server-side (`import 'server-only'`).
- Reuse `extractor`/`filter`/`validator`/`getExistingUrls` exactly — no parallel copies.
- Scheduled processing and manual scrape must emit the **same** `ScrapeSummary` shape
  and the same console lines (started, selected sources, per-source homepage,
  candidates found, candidates rejected, duplicates skipped, detail pages scraped,
  inserted, rejected, failed, completed/failed) plus the final summary object.
- `.in()` queries never exceed 15 URLs (reuse `getExistingUrls` chunking).
- Never `.eq('foreignTable.column', value)`; filter joined data in JS.
- 64-bit ids handled via raw-text regex only (see CRITICAL note).
- Cron route: step two runs even if step one fails; failures logged, not thrown to the
  client as 500 unless truly unrecoverable.
- TypeScript throughout; no `any`; small typed functions; explicit return types on
  exported functions.

## Security requirements

- `POST /api/oxylabs/schedules` and `POST /api/oxylabs/scheduled-results/process`
  require `x-biasly-admin-secret` === `BIASLY_ADMIN_SECRET`; missing/invalid → 401.
- `GET /api/cron/pipeline` protected by `CRON_SECRET` (`Authorization: Bearer ...`);
  missing/invalid → 401 in production; skipped in dev. Never uses `BIASLY_ADMIN_SECRET`.
- Oxylabs credentials, service-role key, OpenAI key, and secrets never reach browser
  code and never appear in URLs/query strings.
- GET read routes (`/api/oxylabs/schedules`, `/api/oxylabs/runs`) expose only stored
  schedule/run rows — no secrets.

## Acceptance criteria

1. `POST /api/oxylabs/schedules` creates exactly one hourly Oxylabs schedule per active
   source, stores `oxylabs_schedules` rows, and deactivates Oxylabs schedules absent
   from the DB. Verifiable via `GET /v1/schedules` and `GET /api/oxylabs/schedules`.
2. `GET /api/oxylabs/schedules` lists stored schedule rows; `GET /api/oxylabs/runs`
   lists stored run rows.
3. `POST /api/oxylabs/scheduled-results/process` fetches only `done` job HTML, extracts
   homepage story links, rejects non-article URLs, skips duplicates, scrapes detail
   pages, validates, inserts valid articles, writes `oxylabs_schedule_runs` rows, and
   returns a `ScrapeSummary` identical in shape to manual scrape. Never saves a homepage
   as an article.
4. `GET /api/cron/pipeline` with the correct secret runs processing then analysis; with
   a missing/wrong secret in production returns 401; step two runs even if step one
   fails.
5. `vercel.json` registers `/api/cron/pipeline` at `15 * * * *`.
6. 64-bit ids are never corrupted (sync round-trips and re-lists the exact ids).
7. No duplicated scraping logic; manual and scheduled paths share the core processor.
8. `npm run lint` and `npx tsc --noEmit` pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`

## Exact manual test steps (after implementation)

Run the dev server and **watch its terminal** — scrape/analysis progress logs there.

```bash
npm run dev
```

1. **Create schedules (one-time):**
   ```bash
   curl -X POST http://localhost:3000/api/oxylabs/schedules \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET"
   ```
   Expect a summary with one schedule per active source and `deactivated_orphans`.

2. **List stored schedules:**
   ```bash
   curl http://localhost:3000/api/oxylabs/schedules
   ```

3. **Wait for the top of an hour** (Oxylabs runs at `0 * * * *`), then process:
   ```bash
   curl -X POST http://localhost:3000/api/oxylabs/scheduled-results/process \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET"
   ```
   Expect a `ScrapeSummary`; confirm new `articles` rows and `oxylabs_schedule_runs`
   rows; confirm no homepage was saved as an article.

4. **List runs:**
   ```bash
   curl http://localhost:3000/api/oxylabs/runs
   ```

5. **Cron route (dev — secret check skipped):**
   ```bash
   curl http://localhost:3000/api/cron/pipeline
   ```
   Expect processing then analysis to run; newly inserted articles get analyzed and
   appear on the homepage once `analyzed_at` is set.

6. **Auth negative tests:**
   ```bash
   curl -X POST http://localhost:3000/api/oxylabs/schedules            # → 401
   curl -X POST http://localhost:3000/api/oxylabs/scheduled-results/process  # → 401
   ```

7. **Production cron note:** Vercel injects `CRON_SECRET` and calls the route at
   `15 * * * *`. Setting up Oxylabs schedules (step 1) and Vercel Cron (`vercel.json`)
   are two independent one-time steps; both must be done for full automation. On Vercel
   Hobby, cron granularity may be limited to daily — note for the user at deploy time.
