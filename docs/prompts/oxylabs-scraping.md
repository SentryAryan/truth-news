# Oxylabs scraping (manual scrape-to-insert)

## Goal

Implement the manual Oxylabs scrape-to-insert pipeline behind `POST /api/scrape`
(AGENTS §8–17). Load active sources from Supabase, scrape homepages via Oxylabs,
extract and filter candidate article URLs with Cheerio, dedupe (chunked ≤15),
scrape detail pages, validate (AGENTS §13), insert append-only, and log a `logs`
row. Protect with `x-biasly-admin-secret`. Scheduler / cron / AI analysis are out
of scope.

## Skills read

- Project Oxylabs patterns (Realtime API Basic Auth, `universal` source)
- Supabase service-role queries (`getActiveSources`, `getExistingOriginalUrls`,
  `insertArticles`, `createLog`, `completeLog`)
- Plan: Oxylabs manual scrape-to-insert pipeline

## Existing code inspected

- `lib/supabase/queries/sources.ts` — `getActiveSources()`
- `lib/supabase/queries/articles.ts` — chunked `getExistingOriginalUrls`, `insertArticles`
- `lib/supabase/queries/logs.ts` — `createLog`, `completeLog` on table `logs`
- `supabase/schema.sql` / `seed.sql` — sources, articles, logs; 5 seed sources
- No `lib/pipeline/*` or `app/api/scrape` yet

## Decisions or assumptions

1. Oxylabs `source: "universal"`; no `render: "html"` for `parser_strategy === "generic"`.
2. Per-domain `isArticleUrl` for Reuters, BBC, Guardian, Fox, NPR + strict fallback.
3. Default `limitPerSource = 5`; optional `sourceIds` filter.
4. Use `createLog` / `completeLog` (not deprecated `pipeline_logs` names).
5. Include `GET /api/sources` behind the same admin secret.
6. Vitest unit tests for URL filters and validation only (no live Oxylabs in CI).

## Files likely to change

Create: `lib/auth/admin-secret.ts`, `lib/pipeline/oxylabs.ts`, `lib/pipeline/parse.ts`,
`lib/pipeline/scrape.ts`, `app/api/scrape/route.ts`, `app/api/sources/route.ts`,
vitest config + parse tests.

Modify: `package.json`, `.env.sample`.

## Implementation requirements

As in AGENTS §9–16 and docs/prompts/006-oxylabs-scraping-pipeline.md: sequential
per-source scrape, console `[scrape]` logging, typed `ScrapeResult` summary.

## Security requirements

- Never expose Oxylabs or `BIASLY_ADMIN_SECRET` to client code.
- Admin secret only via `x-biasly-admin-secret` header.
- Server-only pipeline modules; append-only article inserts.

## Acceptance criteria

- [ ] `POST /api/scrape` with valid secret runs scrape-to-insert and returns summary
- [ ] 401 without / wrong secret
- [ ] Only valid articles (image + published_at + body gate) inserted
- [ ] Duplicates skipped via chunked URL check
- [ ] `logs` row created and completed
- [ ] `GET /api/sources` lists active sources with admin secret
- [ ] Unit tests for `isArticleUrl` / `validateParsedArticle`
- [ ] typecheck, lint, build pass

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test` (vitest)

## Exact manual test steps

1. Ensure `.env.local` has `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `BIASLY_ADMIN_SECRET`.
2. `npm run dev`
3. `curl -X GET http://localhost:3000/api/sources -H "x-biasly-admin-secret: YOUR_SECRET"`
4. `curl -X POST http://localhost:3000/api/scrape -H "Content-Type: application/json" -H "x-biasly-admin-secret: YOUR_SECRET" -d "{\"limitPerSource\": 2}"`
5. Watch the Next.js terminal for `[scrape]` logs; confirm articles + log in Supabase.
6. Re-run scrape; confirm duplicates skipped.
7. Call without secret; expect 401.
