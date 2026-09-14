# Seed — 5 Active News Sources

## Goal

Insert 5 active public news sources into the Supabase `sources` table via an idempotent
`supabase/seed.sql` file that the user runs in the Dashboard SQL Editor (same workflow as
`schema.sql`). Update `supabase/README.md` to document the seed step.

## Skills read

- `.agents/skills/supabase/SKILL.md` — idempotent SQL, RLS model, service_role writes.
- `.agents/skills/next-best-practices/data-patterns.md` — no writes from UI or page render.

## Existing code inspected

- `supabase/schema.sql` — `sources` table: `id uuid pk default gen_random_uuid()`,
  `name text not null`, `listing_url text not null unique`, `logo_url text`,
  `parser_strategy text not null default 'generic'`, `is_active boolean not null default true`,
  `created_at`, `updated_at`.
- `supabase/README.md` — current steps 1–6. Seed step is missing; README references "Step 10"
  but has no seed content yet.
- `lib/supabase/queries/sources.ts` — `getActiveSources()` filters `is_active = true`.

## Decision

User selected **Option A**: Reuters, BBC News, The Guardian, Fox News, NPR.

## Assumptions (small, reversible)

- `logo_url` set to `null` for all rows — no CDN in scope yet; can be updated later.
- `parser_strategy` set to `'generic'` for all rows — the default; custom strategies come
  with the scraping step.
- `is_active` set to `true` for all rows — the intent of this task.
- Listing URLs are the primary section/news pages used by the scraping pipeline.
- Seed is idempotent: `ON CONFLICT (listing_url) DO NOTHING` so re-running causes no error
  and no duplicate rows.

## Sources

| Name | listing_url | Notes |
|---|---|---|
| Reuters | https://www.reuters.com/ | Center wire service |
| BBC News | https://www.bbc.com/news | Center international |
| The Guardian | https://www.theguardian.com/us-news | Center-left |
| Fox News | https://www.foxnews.com/ | Right |
| NPR | https://www.npr.org/sections/news/ | Center-left |

## Files to create / modify

- `supabase/seed.sql` — **create**: 5 idempotent INSERT statements.
- `supabase/README.md` — **update**: insert a new "5. Seed sources" step between the current
  step 4 (Apply schema) and step 5 (Verify). Renumber subsequent steps.

## Implementation requirements

1. **`supabase/seed.sql`**
   - Include a header comment identical in style to `schema.sql`.
   - One `INSERT INTO sources (name, listing_url, logo_url, parser_strategy, is_active)`
     per source, each terminated with `ON CONFLICT (listing_url) DO NOTHING;`.
   - `logo_url` value is `NULL`.
   - `parser_strategy` value is `'generic'`.
   - `is_active` value is `true`.
   - No `id`, `created_at`, or `updated_at` — let the DB defaults handle them.

2. **`supabase/README.md`**
   - Insert a new **"5. Seed sources"** section after the "4. Apply the schema" section.
   - Instruct: SQL Editor → New query → paste `seed.sql` → Run. Idempotent, safe to re-run.
   - Renumber current steps 5 and 6 to 6 and 7.
   - Update the footer note to remove the "Step 10" reference (no plan.md in this project).

## Security requirements

- No credentials in `seed.sql` or `README.md`.
- Seed is pure SQL with no secrets.
- `seed.sql` is committed to the repo — contains no sensitive data.

## Acceptance criteria

- `supabase/seed.sql` exists and contains exactly 5 INSERT statements.
- All 5 rows use `ON CONFLICT (listing_url) DO NOTHING`.
- `is_active = true` and `parser_strategy = 'generic'` for all rows.
- Running `seed.sql` in the Dashboard SQL Editor after `schema.sql` produces 5 rows in
  Table Editor → sources, with no error on re-run.
- `supabase/README.md` includes the seed step with correct step numbering.
- `npm run lint` and `npm run build` pass (no app code changes required).

## Checks to run

- `npm run lint`
- `npm run build`
