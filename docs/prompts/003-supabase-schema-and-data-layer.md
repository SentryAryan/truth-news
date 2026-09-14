# 003 — Supabase Schema and Data Layer

## Task goal

Stand up Supabase as biasly's persistent database: a complete SQL schema for the four
entities, a centralized server-side data layer (clients + typed queries), and clear
**Supabase Dashboard steps** the user follows to create the project and apply the schema.

## Matching plan step

**Step 03 — Supabase schema and data layer.**

## Skills read

- `.agents/skills/supabase/SKILL.md` — RLS-on-exposed-schema rules, key exposure
  (`service_role` server-only; publishable/anon for frontend), `TO` clause over
  `auth.role()`, views bypass RLS, Data API table exposure + `GRANT` requirement.
- `.agents/skills/next-best-practices` — server-only modules, RSC data reads.

## Decisions made (from user)

1. **Access model — Public read + RLS.** Expose `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the browser. RLS enabled on all tables with
   `SELECT` policies (`TO anon, authenticated`) for publicly readable data. Writes use
   the **server-only `SUPABASE_SERVICE_ROLE_KEY`** (bypasses RLS) — no insert/update
   policies for public roles. Install only `@supabase/supabase-js` (no `@supabase/ssr`;
   no Supabase Auth — AGENTS §23).

## Assumptions (recorded; small/reversible)

- **What's public:** active **sources** (`is_active = true`), **analyzed articles**
  (`analyzed_at is not null`), and their **article_analyses**. **pipeline_logs** are NOT
  publicly readable (operational data) — server-only via service role.
- **raw_text exposure:** with table-level RLS, a public `SELECT` on analyzed articles
  technically exposes `raw_text` via the Data API. Acceptable for now; if undesired we can
  later add a `security_invoker` view exposing only display columns. Flagged as follow-up.
- **Data API grants:** include explicit `GRANT SELECT ... TO anon, authenticated` in the
  schema (skill note #4) so policies actually take effect regardless of Data API settings.
- **parser_strategy** is `text` defaulting to `'generic'` (extensible without an enum
  migration), per AGENTS "keep parser strategy extensible."
- **Schema applied via Dashboard SQL editor** (no CLI/MCP project linked). A `.sql` file
  is committed for the user to paste/run.
- **Pages stay on mock data** this step; wiring real reads is Step 06. Query functions are
  built now (centralized data layer) and consumed by later steps.
- CHECK constraints enforce numeric ranges in the DB as defense-in-depth alongside Zod
  (AGENTS §15): sentiment_score ∈ [-1,1], bias_score ∈ [-1,1], confidence ∈ [0,1].

## Files to create / modify

Create:
- `supabase/schema.sql` — enums, tables, indexes, constraints, `updated_at` trigger,
  RLS enable + SELECT policies + grants, table/column comments.
- `supabase/README.md` — step-by-step Dashboard instructions (create project, copy keys,
  set env, run SQL, verify RLS/policies, expose Data API).
- `lib/supabase/types.ts` — hand-written `Database` type (Row/Insert/Update + enums)
  matching the schema, plus convenience domain types.
- `lib/supabase/server.ts` — `import "server-only"`; `createServiceRoleClient()` using
  `SUPABASE_SERVICE_ROLE_KEY` (no session persistence). For writes + privileged reads.
- `lib/supabase/public.ts` — `createPublicClient()` using the anon key, for public reads.
- `lib/supabase/queries/sources.ts` — `getActiveSources()`.
- `lib/supabase/queries/articles.ts` — `getLatestAnalyzedArticles(limit?)`,
  `getArticleWithAnalysis(id)`, `getExistingOriginalUrls(urls)`,
  `getUnanalyzedArticles(limit?)`, `insertArticles(rows)`, `setArticleAnalyzedAt(id, at)`.
- `lib/supabase/queries/analyses.ts` — `upsertArticleAnalysis(row)`.
- `lib/supabase/queries/logs.ts` — `createPipelineLog(input)`, `completePipelineLog(id, patch)`.
- `lib/supabase/queries/index.ts` — re-exports.

Modify:
- `.env.example` and `.env.local` — add the three Supabase vars.
- `package.json` — add `@supabase/supabase-js` (and `server-only` if not already present).

## Schema spec (`supabase/schema.sql`)

Enums:
- `sentiment_label`: `positive | neutral | negative`
- `bias_label`: `left | center-left | center | center-right | right | unclear`
- `pipeline_log_type`: `scrape | analysis | scheduled_pipeline`
- `pipeline_log_status`: `running | success | partial_success | failed`

`sources`: `id uuid pk default gen_random_uuid()`, `name text not null`,
`listing_url text not null unique`, `logo_url text`,
`parser_strategy text not null default 'generic'`, `is_active boolean not null default true`,
`created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.

`articles`: `id uuid pk`, `source_id uuid not null references sources(id) on delete cascade`,
`original_url text not null unique`, `canonical_url text`, `title text not null`,
`image_url text`, `published_at timestamptz`, `raw_text text not null`,
`scraped_at timestamptz not null default now()`, `analyzed_at timestamptz`,
`created_at`, `updated_at`. Indexes: `source_id`, `analyzed_at`, `published_at`.

`article_analyses`: `id uuid pk`,
`article_id uuid not null unique references articles(id) on delete cascade`
(unique = at most one current analysis), `summary text not null check (length(trim(summary))>0)`,
`sentiment_score double precision not null check (between -1 and 1)`,
`sentiment_label sentiment_label not null`,
`bias_score double precision not null check (between -1 and 1)`,
`bias_label bias_label not null`,
`confidence double precision not null check (between 0 and 1)`,
`framing_notes text[] not null default '{}'`, `loaded_terms text[] not null default '{}'`,
`disclaimer text not null check (length(trim(disclaimer))>0)`, `model text`,
`created_at`, `updated_at`.

`pipeline_logs`: `id uuid pk`, `log_type pipeline_log_type not null`,
`status pipeline_log_status not null`, `sources_checked int not null default 0`,
`articles_found int not null default 0`, `articles_inserted int not null default 0`,
`articles_analyzed int not null default 0`, `errors jsonb not null default '[]'::jsonb`,
`metadata jsonb not null default '{}'::jsonb`,
`started_at timestamptz not null default now()`, `finished_at timestamptz`, `created_at`.

Common: `set_updated_at()` trigger function + `BEFORE UPDATE` triggers on the three tables
that have `updated_at`.

RLS + grants:
- `alter table ... enable row level security;` on all four tables.
- `grant select on sources, articles, article_analyses to anon, authenticated;`
- Policies (`for select`):
  - `sources`: `to anon, authenticated using (is_active = true)`
  - `articles`: `to anon, authenticated using (analyzed_at is not null)`
  - `article_analyses`: `to anon, authenticated using (true)`
  - `pipeline_logs`: no public policy + no grant (server-only).
- No insert/update/delete policies for public roles (service role bypasses RLS).

## Implementation requirements

1. `npm install @supabase/supabase-js server-only`.
2. `lib/supabase/server.ts`: `import "server-only"`; read `SUPABASE_SERVICE_ROLE_KEY` +
   `NEXT_PUBLIC_SUPABASE_URL`; `createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })`. Throw a clear error if envs missing.
3. `lib/supabase/public.ts`: `createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`.
4. Query functions: small, typed, no `any`; website reads use the public client, pipeline
   writes/privileged reads use the service-role client. `getArticleWithAnalysis` joins the
   analysis (`*, article_analyses(*)`). Return typed rows; handle Supabase errors by
   throwing with a safe message (no secrets).
5. `.env.example` / `.env.local` additions:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

## Dashboard steps (also captured in `supabase/README.md`)

1. Create a project at supabase.com (save the DB password; pick a region).
2. Project Settings → **API**: copy **Project URL**, **anon/publishable key**, and
   **service_role key**.
3. Paste into `.env.local`: URL → `NEXT_PUBLIC_SUPABASE_URL`, anon →
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service_role → `SUPABASE_SERVICE_ROLE_KEY`.
4. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
5. **Table Editor**: confirm the four tables; **Authentication → Policies**: confirm RLS is
   on and the SELECT policies exist.
6. Restart `npm run dev` so new env vars load.

## Security requirements (AGENTS §18 + Supabase skill)

- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never `NEXT_PUBLIC_`, never imported in
  client code (`server.ts` guards with `import "server-only"`).
- Only the publishable/anon key is browser-exposed.
- RLS enabled on every table; public roles get SELECT-only on display data; logs stay
  private; writes restricted to the service role.
- No Supabase Auth. No secrets logged. Use `TO anon/authenticated` (not deprecated
  `auth.role()`).

## Acceptance criteria

- `@supabase/supabase-js` installed; `supabase/schema.sql` defines all four entities with
  enums, constraints, indexes, `updated_at` triggers, RLS + SELECT policies + grants.
- Server (service-role) and public (anon) clients exist; server client is `server-only`.
- Centralized typed query functions exist for sources, articles, analyses, and logs.
- `.env.example`/`.env.local` include the three Supabase vars; service key is not public.
- `supabase/README.md` documents the Dashboard steps.
- `npm run lint` and `npm run build` pass (no live DB needed to compile).

## Checks to run

- `npm run lint`
- `npm run build`
- Note: actual DB connectivity is verified by the user after creating the project, pasting
  keys, and running the SQL (record in plan).

## Plan update instructions

After implementation, update `plan.md`: mark Step 03 complete; record files changed,
checks run, decisions (public-read + RLS), assumptions (raw_text exposure follow-up,
pages still on mock data), and the user follow-up (create project, paste keys, run SQL).
Set next recommended step to Step 05 (details UI) or Step 06 (data wiring).
