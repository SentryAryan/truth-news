# 008 — Oxylabs Scheduler for Hourly Source Scraping

## Goal

Implement Oxylabs Scheduler integration so that active source homepages are scraped hourly without manual intervention. This adds three capabilities:

1. **`POST /api/oxylabs/schedules`** — Sync: create or update one Oxylabs schedule per active source (hourly cron, 1-year end_time). Store schedule IDs in Supabase `oxylabs_schedules` table.
2. **`GET /api/oxylabs/schedules`** — Read: return all schedule rows from Supabase.
3. **`POST /api/oxylabs/scheduled-results/process`** — Process: for each active schedule stored in Supabase, fetch the latest completed Oxylabs run jobs, retrieve their HTML results, run the full existing scrape pipeline (extract → filter → dedupe → detail-scrape → validate → insert), and log a `scheduled_pipeline` pipeline log.

All three routes require `x-biasly-admin-secret`.

## Skills Read

- `.agents/skills/oxylabs-web-scraper/SKILL.md` — Scheduler API endpoints (create, get, runs, jobs), auth, response shape
- `.agents/skills/supabase/SKILL.md` — schema changes, service role queries, RLS
- `.agents/skills/next-best-practices/SKILL.md` — route handlers, server-only modules

## Existing Code Inspected

- `lib/pipeline/oxylabs.ts` — `scrapeUrl()` using realtime endpoint, Basic Auth pattern
- `lib/pipeline/scrape.ts` — `runScrape()`, `scrapeSource()`, `chunkArray()`, `bumpReason()`, `ScrapeResult` type — **reuse everything**
- `lib/pipeline/parse.ts` — `extractCandidateLinks()`, `parseArticlePage()`, `validateParsedArticle()`, `splitIntoParagraphs()`
- `lib/supabase/queries/sources.ts` — `getActiveSources()`
- `lib/supabase/queries/articles.ts` — `getExistingOriginalUrls()`, `insertArticles()`
- `lib/supabase/queries/logs.ts` — `createPipelineLog()`, `completePipelineLog()`
- `lib/supabase/types.ts` — existing types; must add `OxylabsScheduleRow`, `OxylabsScheduleInsert`, `OxylabsScheduleRunRow`, `OxylabsScheduleRunInsert`
- `supabase/schema.sql` — must add `oxylabs_schedules` and `oxylabs_schedule_runs` tables
- `app/api/scrape/route.ts` — pattern for thin route handlers with admin secret check
- `lib/supabase/server.ts` — `createServiceRoleClient()`

## Decisions and Assumptions

1. **Oxylabs Scheduler base URL**: `https://data.oxylabs.io/v1/schedules` (different from realtime endpoint).
2. **Cron expression**: `"0 * * * *"` — every hour at minute 0.
3. **End time**: 1 year from the date `POST /api/oxylabs/schedules` is called.
4. **One schedule per source**: Each active source gets its own Oxylabs schedule. The Supabase `oxylabs_schedules` table stores the mapping: `source_id → oxylabs_schedule_id`.
5. **Upsert behavior**: If a schedule already exists for a source (row found by `source_id`), skip re-creating (Oxylabs doesn't expose PATCH — avoid billing surprise from duplicate schedules). Only create if no row exists for that source.
6. **Scheduled result retrieval**: Oxylabs Scheduler does not push results back to us. We must pull: `GET /v1/schedules/{id}/runs` to get the latest run, then `GET /v1/schedules/{id}/jobs` to get job IDs, then fetch each job's result via the realtime results endpoint `GET https://data.oxylabs.io/v1/queries/{jobId}/results`.
7. **Only latest run**: When processing, only use the most recent run (`runs[runs.length - 1]`). Older runs would produce duplicates already in Supabase.
8. **Run deduplication**: Store the last processed `run_id` per schedule in `oxylabs_schedules.last_processed_run_id`. Skip if `run_id` matches already-processed value.
9. **Homepage HTML re-use**: The job result HTML from Oxylabs is the homepage HTML — pass it directly to `extractCandidateLinks()` exactly as manual scraping does. Then scrape article detail pages via the realtime endpoint.
10. **Do not duplicate scraping logic**: Import `extractCandidateLinks`, `parseArticlePage`, `validateParsedArticle`, `splitIntoParagraphs` from `lib/pipeline/parse.ts` and `scrapeUrl` from `lib/pipeline/oxylabs.ts`.
11. **limitPerSource for scheduled runs**: Default to 5, same as manual scraping.
12. **`oxylabs_schedule_runs` table**: Log each processing invocation with schedule_id, run_id, status, articles_inserted, metadata.
13. **No cloud storage**: Per the Oxylabs docs recommendation to use cloud storage with Scheduler, but for this project we pull results via the jobs API instead — simpler, no extra infrastructure.

## New Supabase Tables

### `oxylabs_schedules`

```sql
create table if not exists oxylabs_schedules (
  id                      uuid primary key default gen_random_uuid(),
  source_id               uuid not null unique references sources(id) on delete cascade,
  oxylabs_schedule_id     bigint not null,
  cron                    text not null,
  end_time                text not null,
  active                  boolean not null default true,
  last_processed_run_id   bigint,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
```

### `oxylabs_schedule_runs`

```sql
create table if not exists oxylabs_schedule_runs (
  id                  uuid primary key default gen_random_uuid(),
  schedule_id         uuid not null references oxylabs_schedules(id) on delete cascade,
  oxylabs_run_id      bigint not null,
  status              pipeline_log_status not null,
  articles_inserted   int not null default 0,
  metadata            jsonb not null default '{}'::jsonb,
  processed_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
```

Both tables: enable RLS, no public grant (server-only access via service role).

## Files Likely to Change

| File | Change |
|------|--------|
| `supabase/schema.sql` | Add `oxylabs_schedules` and `oxylabs_schedule_runs` tables + RLS |
| `lib/supabase/types.ts` | Add `OxylabsScheduleRow`, `OxylabsScheduleInsert`, `OxylabsScheduleRunRow`, `OxylabsScheduleRunInsert`, update `Database` type |
| `lib/pipeline/oxylabs.ts` | Add `OxylabsSchedulerClient` with methods: `createSchedule`, `getSchedules`, `getScheduleRuns`, `getScheduleJobs`, `getJobResult` |
| `lib/supabase/queries/schedules.ts` | New: `upsertSchedule`, `getScheduleBySourceId`, `getAllSchedules`, `updateLastProcessedRunId`, `insertScheduleRun` |
| `lib/pipeline/scheduler.ts` | New: `syncSchedules()` and `processScheduledResults()` — orchestration only, reuses parse/scrape imports |
| `app/api/oxylabs/schedules/route.ts` | New: `POST` (sync) + `GET` (list) |
| `app/api/oxylabs/scheduled-results/process/route.ts` | New: `POST` (process) |

## Implementation Requirements

### 1. `lib/pipeline/oxylabs.ts` additions

Add a `SCHEDULER_BASE` constant: `https://data.oxylabs.io/v1/schedules`

Add helper `oxyLabsSchedulerFetch(path, init)` — handles Basic Auth, base URL, JSON parse.

Add typed functions (all server-only):
- `createOxylabsSchedule(items, cron, endTime)` → `{ schedule_id: number, active: boolean, cron: string, end_time: string, next_run_at: string }`
- `getOxylabsScheduleRuns(scheduleId)` → `{ runs: Array<{ run_id: number, jobs: Array<{ id: number, result_status: string }>, success_rate: number }> }`
- `getOxylabsScheduleJobs(scheduleId)` → `{ jobs: number[] }`
- `getOxylabsJobResult(jobId)` → `string` (HTML content, same shape as `scrapeUrl`)
- `setOxylabsScheduleState(scheduleId, active)` → `void`

### 2. `lib/supabase/queries/schedules.ts` (new file)

```ts
import "server-only";
// Functions:
// upsertScheduleForSource(sourceId, scheduleData) → OxylabsScheduleRow
// getScheduleBySourceId(sourceId) → OxylabsScheduleRow | null
// getAllSchedules() → OxylabsScheduleRow[]
// updateLastProcessedRunId(scheduleId, runId) → void
// insertScheduleRun(row: OxylabsScheduleRunInsert) → OxylabsScheduleRunRow
```

### 3. `lib/pipeline/scheduler.ts` (new file)

#### `syncSchedules()`

1. Load all active sources from Supabase.
2. For each source, check if a schedule row exists (`getScheduleBySourceId`).
3. If no row: call `createOxylabsSchedule` with `items: [{ source: "universal", url: source.listing_url }]`, cron `"0 * * * *"`, end_time 1 year from now.
4. Insert into `oxylabs_schedules` via `upsertScheduleForSource`.
5. If row exists and `active = true`: skip (already synced).
6. Log created/skipped counts per source.
7. Return a summary: `{ created: number, skipped: number, sources: string[] }`.

#### `processScheduledResults()`

1. Load all `oxylabs_schedules` rows where `active = true`.
2. For each schedule:
   a. Call `getOxylabsScheduleRuns(oxylabs_schedule_id)`.
   b. If no runs or last run is not `done` for any job, skip.
   c. Get latest run (`runs[0]` — Oxylabs returns newest first).
   d. If `run.run_id === last_processed_run_id`, log "already processed" and skip.
   e. Filter jobs with `result_status === "done"`.
   f. For each done job, call `getOxylabsJobResult(job.id)` to get homepage HTML.
   g. Pass HTML to `extractCandidateLinks(html, source.listing_url, domain)`.
   h. Dedupe against Supabase (chunk ≤ 15).
   i. Scrape fresh candidates via `scrapeUrl()`, validate, insert (up to 5 per source).
   j. Update `last_processed_run_id` on the schedule row.
   k. Insert a `oxylabs_schedule_runs` log row with counts.
3. Log a final summary with total sources processed, articles inserted, skipped.

Important: load the source row for each schedule to get `listing_url` and `name` (join or separate query by `source_id`).

### 4. API Routes

#### `app/api/oxylabs/schedules/route.ts`

```ts
export async function POST(req) // admin secret → syncSchedules() → return summary
export async function GET(req)  // admin secret → getAllSchedules() → return rows
```

#### `app/api/oxylabs/scheduled-results/process/route.ts`

```ts
export async function POST(req) // admin secret → processScheduledResults() → return summary
```

All routes: thin handlers. Validate secret. Call pipeline. Return JSON. No business logic in route.

## Security Requirements

- All three routes require `x-biasly-admin-secret` header; reject with 401 if missing or wrong.
- `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD` read only in `lib/pipeline/oxylabs.ts` (server-only).
- `SUPABASE_SERVICE_ROLE_KEY` read only in `lib/supabase/server.ts`.
- No pipeline secrets in browser bundles — all new files start with `import "server-only"` or are route handlers.
- `oxylabs_schedules` and `oxylabs_schedule_runs`: RLS enabled, no public grants.

## Schema Changes to Run in Supabase Dashboard

After writing the schema, provide this exact SQL to the user to run in Supabase Dashboard → SQL Editor:

```sql
-- oxylabs_schedules
create table if not exists oxylabs_schedules (
  id                      uuid primary key default gen_random_uuid(),
  source_id               uuid not null unique references sources(id) on delete cascade,
  oxylabs_schedule_id     bigint not null,
  cron                    text not null,
  end_time                text not null,
  active                  boolean not null default true,
  last_processed_run_id   bigint,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

drop trigger if exists oxylabs_schedules_set_updated_at on oxylabs_schedules;
create trigger oxylabs_schedules_set_updated_at
  before update on oxylabs_schedules
  for each row execute function set_updated_at();

-- oxylabs_schedule_runs
create table if not exists oxylabs_schedule_runs (
  id                  uuid primary key default gen_random_uuid(),
  schedule_id         uuid not null references oxylabs_schedules(id) on delete cascade,
  oxylabs_run_id      bigint not null,
  status              pipeline_log_status not null,
  articles_inserted   int not null default 0,
  metadata            jsonb not null default '{}'::jsonb,
  processed_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

alter table oxylabs_schedules     enable row level security;
alter table oxylabs_schedule_runs enable row level security;
-- No public grants — server-only tables.
```

## Acceptance Criteria

- [ ] `POST /api/oxylabs/schedules` creates one Oxylabs schedule per active source that doesn't already have one; returns `{ created, skipped }` summary.
- [ ] `GET /api/oxylabs/schedules` returns all rows from `oxylabs_schedules`.
- [ ] `POST /api/oxylabs/scheduled-results/process` fetches latest run HTML for each active schedule, runs the full scrape pipeline, inserts valid articles, updates `last_processed_run_id`, returns summary.
- [ ] No duplicate schedules created for a source that already has one.
- [ ] Already-processed run IDs are skipped (idempotent).
- [ ] All three routes return 401 with missing/wrong secret.
- [ ] Console logs follow the same `[scheduler]` prefix style as `[scrape]`.
- [ ] `oxylabs_schedule_runs` row inserted after each processed run.
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`).

## Checks to Run

```bash
npx tsc --noEmit
```

## Manual Test Steps

Run the Next.js dev server:

```bash
npm run dev
```

Watch the terminal for `[scheduler]` log output.

### Step 1: Run schema SQL in Supabase Dashboard

Copy and run the SQL from "Schema Changes to Run" section above.

### Step 2: Sync schedules (creates Oxylabs schedules for all active sources)

```bash
export BASE_URL="http://localhost:3000"
export BIASLY_ADMIN_SECRET="your-secret"

curl -X POST "$BASE_URL/api/oxylabs/schedules" \
  -H "content-type: application/json" \
  -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
  -d '{}'
```

Expected: JSON with `created` count matching the number of active sources.

### Step 3: List stored schedules

```bash
curl "$BASE_URL/api/oxylabs/schedules" \
  -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET"
```

Expected: JSON array of schedule rows including `oxylabs_schedule_id`.

### Step 4: Process scheduled results

Wait for the Oxylabs schedule to fire (at the next hour), then:

```bash
curl -X POST "$BASE_URL/api/oxylabs/scheduled-results/process" \
  -H "content-type: application/json" \
  -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
  -d '{}'
```

Expected: summary with `sourcesProcessed`, `articlesInserted`, and logs visible in the dev server terminal.

### Step 5: Verify 401 on missing secret

```bash
curl -X POST "$BASE_URL/api/oxylabs/schedules" \
  -H "content-type: application/json" \
  -d '{}'
```

Expected: `{"error":"Unauthorized"}` with HTTP 401.
