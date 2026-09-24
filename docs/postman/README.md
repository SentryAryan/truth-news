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

Each request description in Postman covers auth, body, success shape, and errors.

## Typical flow

1. **List active sources** → copy a source `id` into `sourceId` if you want a scoped scrape  
2. **Scrape** (all or one source)  
3. **Analyze (all pending)** — repeat if `pendingFound` > `analyzed` (capped by `ANALYSIS_MAX_PER_RUN`)  
4. Open `/` and `/news/[id]` in the browser

## Planned stubs (not in `app/api/` yet)

Folder **3. Planned** documents AGENTS.md routes for later:

- `GET /api/logs`
- `POST` / `GET /api/oxylabs/schedules`
- `GET /api/oxylabs/runs`
- `POST /api/oxylabs/scheduled-results/process`
- `GET /api/cron/pipeline` (uses `CRON_SECRET`, not admin secret)

Enable and flesh these out when the handlers ship.

## Maintenance rule

**After any task that adds or changes an API route**, update this collection and this README in the same change so Postman stays the source of truth for manual API testing.
