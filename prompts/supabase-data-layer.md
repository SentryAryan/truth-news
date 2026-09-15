# Supabase schema and data access

## Goal

Stand up Supabase as truth-news source of truth per AGENTS.md §7 / §21: committed SQL
schema (6 core tables, no pgvector yet), Dashboard apply + seed steps, server-only
service-role client, typed query modules, and RSC pages reading stored data instead of mocks.

## Skills / sources

- AGENTS.md §7 (schema), §19 (pending-analysis check), §21 (env / service role)
- Clerk remains auth; no Supabase Auth; `@supabase/supabase-js` only

## Decisions

1. Service-role client only for app reads/writes (`server-only` module)
2. Anon key in env for AGENTS completeness; no browser Supabase client this step
3. RLS on all tables; public SELECT only for active sources, analyzed articles, analyses
4. `bias_label`: `left | center | right | mixed | unclear`
5. Oxylabs schedule IDs stored as `text` (64-bit precision)
6. Wire home + details to live queries with empty / notFound states
7. Seed 5 sources (Reuters, BBC, Guardian, Fox, NPR)

## Files

Create: `supabase/schema.sql`, `supabase/seed.sql`, `supabase/README.md`,
`lib/supabase/types.ts`, `lib/supabase/service.ts`,
`lib/supabase/queries/{sources,articles,analyses,logs,index}.ts`,
`prompts/supabase-data-layer.md`

Modify: `app/(site)/page.tsx`, `app/(site)/news/[id]/page.tsx`, `package.json`,
`tsconfig.json` (exclude `supabase/functions` if needed)

## Security

- `SUPABASE_SERVICE_ROLE_KEY` never `NEXT_PUBLIC_`
- No secrets in SQL/README
- UI read-only

## Acceptance

- Schema + seed + README exist
- Typed service client + query modules work
- Home shows analyzed articles or empty state
- Details require Clerk + live article (notFound if missing/unanalyzed)
- `typecheck`, `lint`, `build` pass

## Manual tests

1. Apply `schema.sql` then `seed.sql` in Supabase SQL Editor
2. Fill `.env.local` Supabase keys
3. `npm run dev` — home empty until scrape/analyze; sources seed visible via Dashboard
4. After articles exist: home cards link to `/news/<uuid>`; signed-out details redirect to sign-in
