# Supabase setup (truth-news)

Schema changes go through migration files and `npm run db:push`. The Next.js app
uses the **service role** key only on the server (`lib/supabase/service.ts`).

## 1. Create a project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project (or use an existing one)
3. Wait until the database is ready

## 2. Copy API keys

Project **Settings → API**:

| Env var | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server only — never expose to the browser) |

Paste them into `.env.local` (see `.env.sample`). Restart `npm run dev` after changing env.

## 3. Apply schema changes

Migrations live in [`migrations/`](./migrations). [`schema.sql`](./schema.sql) is the
full snapshot of the current schema. When a migration changes the database, update
that snapshot in the same change.

One-time link (database password is the one set when the Supabase project was created):

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

`<project-ref>` is the subdomain of `NEXT_PUBLIC_SUPABASE_URL`
(`https://<project-ref>.supabase.co`).

Apply pending migrations to the linked project:

```bash
npm run db:push
```

`npm run db:push:dry` lists what would run and does not change the database.

Add the next change:

```bash
npm run db:migration -- <snake_case_name>
```

Edit the new file under `migrations/`, update [`schema.sql`](./schema.sql), then
`npm run db:push`.

The linked database already recorded three earlier migrations. Those files are
in `migrations/` again (`truth_news_core_schema`, `add_pgvector_embedding_and_match_related`,
`embedding_vector_2048_nemotron`) so `db push` can see them. They are already
applied and are not run again.

`saved_articles` is `migrations/20261005124333_saved_articles.sql`. Pushing it
creates the table, index, row level security, and table comment. There are no
anon or authenticated grants.

A brand-new empty project can still be bootstrapped by running [`schema.sql`](./schema.sql)
once in the SQL Editor, then marking the existing migrations applied so a later
push does not replay them:

```bash
npx supabase migration repair --status applied 20261005124333
```

## 4. Seed sources

1. SQL Editor → New query
2. Paste [`seed.sql`](./seed.sql)
3. Run

Inserts five active sources (Reuters, BBC News, The Guardian, Fox News, NPR).
Safe to re-run (`ON CONFLICT (listing_url) DO NOTHING`).

## 5. Seed demo articles (optional, for UI)

After sources exist, either:

- SQL Editor → paste [`seed-demo-articles.sql`](./seed-demo-articles.sql) → Run, or
- From the repo: `node --env-file=.env.local scripts/seed-demo-articles.mjs`

This inserts 6 analyzed articles (stable UUIDs) so the home feed and details pages have content.

## 6. Verify

- **Table Editor**: confirm the seven tables exist; `sources` has 5 rows with `is_active = true`
- Homepage shows articles only after `analyzed_at` is set and an `article_analyses` row exists
- Demo seed articles appear on `/` immediately after step 5

## Security notes

- Never commit real keys or put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*`
- Operational tables (`logs`, Oxylabs tables, `saved_articles`) have RLS enabled and **no** anon grants
- Display tables allow public `SELECT` of active sources / analyzed articles only
