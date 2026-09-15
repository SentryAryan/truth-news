# Supabase setup (truth-news)

Apply the schema and seed in the Supabase Dashboard. The Next.js app uses the
**service role** key only on the server (`lib/supabase/service.ts`).

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

## 3. Apply the schema

1. Dashboard → **SQL Editor** → New query
2. Paste the contents of [`schema.sql`](./schema.sql)
3. Run

This creates: `sources`, `articles`, `article_analyses`, `logs`,
`oxylabs_schedules`, `oxylabs_schedule_runs`, enums, indexes, triggers, and RLS.

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

- **Table Editor**: confirm the six tables exist; `sources` has 5 rows with `is_active = true`
- Homepage shows articles only after `analyzed_at` is set and an `article_analyses` row exists
- Demo seed articles appear on `/` immediately after step 5

## Security notes

- Never commit real keys or put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*`
- Operational tables (`logs`, Oxylabs tables) have RLS enabled and **no** anon grants
- Display tables allow public `SELECT` of active sources / analyzed articles only
