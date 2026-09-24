# 011 — Home pagination and filters

## Goal

Add server-side homepage pagination (page sizes 10 / 20 / 50) and filters for
bias label, sentiment label, and source. Wire CategoryBar to active sources.
Drive all state from URL searchParams. Show responsive filter/pagination controls
on the Top News row and below the article grid.

## Skills / docs

- Design system: `001b`, `001`, `001c`
- Next.js App Router `searchParams` (Next 16 Promise params)
- Existing: `getLatestAnalyzedArticles`, `CategoryBar`, `Chip`, `Button`

## Decisions

- URL params: `page`, `pageSize`, `bias`, `sentiment`, `source`
- Default pageSize: 20; allowed: 10, 20, 50
- CategoryBar chips = All + active sources (same `source` param)
- Do not use supabase-js joined `.eq('foreignTable.col')` — filter analysis ids in a prior query
- shadcn-style Pagination + Select using semantic tokens

## Acceptance

- Changing filters/pageSize resets to page 1
- Server returns only the current page of matching analyzed articles
- Controls top-right of Top News and bottom of grid; responsive
- typecheck, lint, test, build pass
