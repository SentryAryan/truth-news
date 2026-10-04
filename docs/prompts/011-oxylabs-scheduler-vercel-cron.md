# 011 — Oxylabs Scheduler + Vercel Cron (automatic hourly pipeline)

## Goal

Make truth-news scrape and analyze news automatically every hour by:

1. Creating one Oxylabs Scheduler schedule per active source homepage (hourly).
2. Processing completed scheduled job results through the same validation, cleanup, dedupe, and console summary as manual scraping.
3. Chaining scheduled-result processing, then AI analysis, behind `GET /api/cron/pipeline` at `:15` past every hour.

## Shipped layout

- `lib/pipeline/scrape.ts` — `processSourceHomepage`, `runScrape`, shared `ScrapeResult`
- `lib/oxylabs/safe-json.ts` — quote 16+ digit JSON integers outside strings before `JSON.parse`
- `lib/oxylabs/scheduler-client.ts` — `https://data.oxylabs.io` client (`POST /v1/schedules`, `GET /v1/schedules`, `GET /v1/schedules/{id}/runs`, `GET /v1/queries/{id}/results`, `PUT /v1/schedules/{id}/state`)
- `lib/oxylabs/pick-run.ts` — newest unprocessed `done` run
- `lib/oxylabs/sync-schedules.ts` — idempotent sync, then orphan deactivation
- `lib/pipeline/scheduled-results.ts` — `processScheduledResults`
- `lib/supabase/queries/schedules.ts`
- `lib/auth/cron-secret.ts`
- `app/api/oxylabs/schedules/route.ts` — `POST` sync, `GET` list (admin secret)
- `app/api/oxylabs/runs/route.ts` — `GET` (admin secret)
- `app/api/oxylabs/scheduled-results/process/route.ts` — `POST` (admin secret)
- `app/api/cron/pipeline/route.ts` — `GET`, `CRON_SECRET` bearer, skipped when `NODE_ENV === "development"`
- `vercel.json` — `15 * * * *`

No schema change. Schedule ids stay text. Job params match manual scrape: `{ source: "universal", url }` with cron `0 * * * *` and `end_time` `2035-12-31 23:59:59`.

Detail pages still use live `scrapeUrl()`. `CRON_SECRET` is not added to `.env.local`.

## Manual test

Use `docs/postman/truth-news.postman_collection.json` (set `adminSecret`). Watch the Next.js terminal.

1. `POST /api/oxylabs/schedules` — one schedule per active source. A second call reuses them. Oxylabs ids missing from the database are deactivated.
2. `GET /api/oxylabs/schedules` and `GET /api/oxylabs/runs`.
3. After the top of an hour, `POST /api/oxylabs/scheduled-results/process`.
4. Local `GET /api/cron/pipeline` runs processing, then analysis.
5. Missing admin secret on the POST routes returns 401.

Vercel Hobby runs cron once a day. Hourly `15 * * * *` needs a plan that allows hourly cron. Creating schedules and deploying `vercel.json` are separate one-time steps.
