# truth-news Postman collection

Import [`truth-news.postman_collection.json`](./truth-news.postman_collection.json) into Postman to test admin APIs without copying curl each time.

## Quick start

1. `npm run dev`
2. Postman → **Import** → select this JSON file
3. Collection → **Variables**:
   - `baseUrl` → `http://localhost:3000` (or your port)
   - `adminSecret` → `BIASLY_ADMIN_SECRET` from `.env.local`
4. Run **List active sources**, then scrape / analyze as needed

Watch the **Next.js terminal** for scrape and analyze progress logs.

## Implemented requests

| Folder | Request | Method | Path |
|--------|---------|--------|------|
| 1. Sources | List active sources | `GET` | `/api/sources` |
| 2. Pipeline | Scrape (all active sources) | `POST` | `/api/scrape` |
| 2. Pipeline | Scrape (one source) | `POST` | `/api/scrape` |
| 2. Pipeline | Analyze (all pending) | `POST` | `/api/analyze` |
| 2. Pipeline | Analyze (limit / articleIds) | `POST` | `/api/analyze` |
| 3. Oxylabs scheduler | Sync schedules | `POST` | `/api/oxylabs/schedules` |
| 3. Oxylabs scheduler | List schedules | `GET` | `/api/oxylabs/schedules` |
| 3. Oxylabs scheduler | List runs | `GET` | `/api/oxylabs/runs` |
| 3. Oxylabs scheduler | Process scheduled results | `POST` | `/api/oxylabs/scheduled-results/process` |
| 3. Oxylabs scheduler | Cron pipeline | `GET` | `/api/cron/pipeline` |

Scheduler and pipeline action routes use `x-biasly-admin-secret`. `GET /api/cron/pipeline` uses `Authorization: Bearer {{cronSecret}}` in production. Local `next dev` skips that check. Do not put `CRON_SECRET` in `.env.local`.

Each request description in Postman covers auth, body, success shape, and errors.

## Typical flow

1. **List active sources** → copy a source `id` into `sourceId` if you want a scoped scrape
2. **Scrape** (all or one source) or **POST /api/oxylabs/schedules** once to register hourly homepage jobs
3. After the top of an hour, **Process scheduled results** (or **Cron pipeline**, which also analyzes)
4. **Analyze (all pending)** — repeat if `pendingFound` > `analyzed` (capped by `ANALYSIS_MAX_PER_RUN`)
5. Open `/` and `/news/[id]` in the browser

Creating Oxylabs schedules and deploying `vercel.json` (`15 * * * *`) are two separate one-time steps. Hourly Vercel Cron needs a plan that allows hourly schedules.

## Planned stubs

Folder **4. Planned** documents AGENTS.md routes that are not implemented yet:

- `GET /api/logs`

## Maintenance rule

**After any task that adds or changes an API route**, update this collection and this README in the same change so Postman stays the source of truth for manual API testing.
