# 006 — Supabase Database Schema & Data Layer

## Goal

Install `@supabase/supabase-js`, define the full Supabase schema, create a server-only
service role client, add typed query functions, and wire both the home page and news
details page to read live data from Supabase instead of mock data.

---

## Skills read

- `.agents/skills/supabase/SKILL.md` — client setup, RLS, query patterns, security checklist
- `.agents/skills/next-best-practices/SKILL.md` — RSC boundaries, data patterns, server-only
  modules

---

## Existing code inspected

- `package.json` — `@supabase/supabase-js` not yet installed; only Clerk and Next.js
- `lib/types.ts` — UI display types (`HomeArticle`, `DetailArticle`, `BiasBreakdown`,
  `SourceEntry`, `RelatedStory`); these stay as-is, mapping happens in query layer
- `lib/mock-articles.ts` — `MOCK_ARTICLES` (12 entries), `MOCK_DETAIL_ARTICLES` (1 entry);
  pages import from here; will be replaced but file kept for reference
- `app/page.tsx` — RSC, reads `MOCK_ARTICLES`, renders `<ArticleCard>` grid
- `app/news/[id]/page.tsx` — async RSC, `generateStaticParams` uses mock IDs, reads
  `getMockDetailArticle(id)`, maps related stories from mock list
- `components/article-card.tsx` — accepts `HomeArticle`; shows category · location,
  title, BiasMeter, sources count
- `.env.local` — has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` already set
- `.env.example` — only has Clerk vars; needs Supabase vars added
- `tsconfig.json` — `exclude: ["node_modules"]`; needs `"supabase/functions"` added

---

## Decisions and assumptions

1. **No `@supabase/ssr`** — we use Clerk for auth, not Supabase Auth. No session cookie
   handling is needed. `@supabase/supabase-js` alone is sufficient.

2. **Service role client only** — all data reads for RSCs and API routes use the service
   role key in a `server-only` module. This bypasses RLS which is correct for server-side
   pipeline reads. The anon key is exposed via `NEXT_PUBLIC_SUPABASE_ANON_KEY` but no
   browser client is created for now (articles are displayed via RSCs only).

3. **RLS enabled on all tables** — required for Supabase best practice. Public read on
   `articles`, `article_analyses`, `sources`. No public access on `logs`,
   `oxylabs_schedules`, `oxylabs_schedule_runs`.

4. **Homepage shows only analyzed articles** — per AGENTS.md §18: "Articles only appear
   on the homepage after `analyzed_at` is set." Query filters `analyzed_at IS NOT NULL`.

5. **UI type mapping** — `HomeArticle.category` → `sources.name`; `HomeArticle.location`
   → `""` (not stored in DB); `HomeArticle.sources` → `1` (single-source model, no
   story clustering yet). `DetailArticle.author` → `sources.name`. `readTime` is
   estimated from `raw_text` word count. These are explicit temporary placeholders,
   not permanent design.

6. **`generateStaticParams` removed** — the news detail page switches to fully dynamic
   rendering since articles come from a live Supabase database, not a static list.

7. **Related articles** → empty array for now; pgvector similarity is section 20.

8. **`supabase/schema.sql`** — canonical schema file. Does NOT include the
   `embedding vector(1536)` column (added in section 20 after pgvector is enabled).

9. **`supabase/functions` tsconfig exclude** — prevents Deno-specific imports in Edge
   Functions from breaking Next.js TypeScript compilation.

10. **`lib/mock-articles.ts` kept** — not deleted; the file is no longer imported by
    pages but may be useful as a reference during development.

---

## Files likely to change

### New files

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Full CREATE TABLE statements for all 6 core tables |
| `lib/supabase/service.ts` | `server-only` service role client factory |
| `lib/supabase/types.ts` | TypeScript row types matching the schema |
| `lib/supabase/queries/articles.ts` | `getArticles()`, `getArticleById()` |
| `lib/supabase/queries/sources.ts` | `getActiveSources()` |

### Modified files

| File | Change |
|---|---|
| `package.json` | Add `@supabase/supabase-js` |
| `.env.example` | Add Supabase env vars |
| `tsconfig.json` | Add `"supabase/functions"` to `exclude` |
| `app/page.tsx` | Replace `MOCK_ARTICLES` with `getArticles()` |
| `app/news/[id]/page.tsx` | Remove `generateStaticParams`, replace mock reads with `getArticleById()` |

---

## Implementation requirements

### 1. Install package

```
npm install @supabase/supabase-js
```

### 2. `supabase/schema.sql`

Create all 6 core tables. Run this in Supabase Dashboard → SQL Editor after implementation.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Sources
create table if not exists sources (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  listing_url   text not null unique,
  parser_strategy text,
  active        boolean not null default true,
  logo_url      text,
  created_at    timestamptz not null default now()
);

-- Articles
create table if not exists articles (
  id            uuid primary key default uuid_generate_v4(),
  source_id     uuid not null references sources(id) on delete cascade,
  original_url  text not null unique,
  canonical_url text,
  title         text not null,
  image_url     text not null,
  published_at  timestamptz not null,
  raw_text      text not null,
  scraped_at    timestamptz not null default now(),
  analyzed_at   timestamptz
);

-- Article analyses
create table if not exists article_analyses (
  id              uuid primary key default uuid_generate_v4(),
  article_id      uuid not null unique references articles(id) on delete cascade,
  summary         text not null,
  sentiment_score numeric(4,3) not null,
  sentiment_label text not null check (sentiment_label in ('positive','neutral','negative')),
  bias_score      numeric(4,3) not null,
  bias_label      text not null check (bias_label in ('left','center-left','center','center-right','right','mixed','unclear')),
  left_percentage  integer not null check (left_percentage between 0 and 100),
  center_percentage integer not null check (center_percentage between 0 and 100),
  right_percentage integer not null check (right_percentage between 0 and 100),
  confidence      numeric(4,3) not null,
  framing_notes   text,
  loaded_terms    text[],
  disclaimer      text,
  model           text not null,
  created_at      timestamptz not null default now()
);

-- Logs
create table if not exists logs (
  id          uuid primary key default uuid_generate_v4(),
  event       text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- Oxylabs schedules
create table if not exists oxylabs_schedules (
  id              uuid primary key default uuid_generate_v4(),
  source_id       uuid not null references sources(id) on delete cascade,
  oxylabs_schedule_id text not null unique,
  created_at      timestamptz not null default now()
);

-- Oxylabs schedule runs
create table if not exists oxylabs_schedule_runs (
  id              uuid primary key default uuid_generate_v4(),
  schedule_id     uuid not null references oxylabs_schedules(id) on delete cascade,
  run_at          timestamptz not null,
  status          text not null,
  articles_inserted integer not null default 0,
  summary         jsonb,
  created_at      timestamptz not null default now()
);

-- RLS: enable on all tables
alter table sources enable row level security;
alter table articles enable row level security;
alter table article_analyses enable row level security;
alter table logs enable row level security;
alter table oxylabs_schedules enable row level security;
alter table oxylabs_schedule_runs enable row level security;

-- Public read policies (anon + authenticated) for display tables
create policy "public can read sources" on sources for select to anon, authenticated using (true);
create policy "public can read articles" on articles for select to anon, authenticated using (true);
create policy "public can read article_analyses" on article_analyses for select to anon, authenticated using (true);

-- No public access on operational tables (service role bypasses RLS)
```

### 3. `lib/supabase/service.ts`

```typescript
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

No singleton — a fresh client per request avoids cross-request leaks in Next.js.

### 4. `lib/supabase/types.ts`

Define `Database` generic type with `public.Tables` rows for all 6 tables, matching
schema columns exactly. Also export convenience row aliases:
- `Source`, `Article`, `ArticleAnalysis`, `Log`, `OxylabsSchedule`, `OxylabsScheduleRun`

Include a joined type `ArticleWithAnalysis` for the detail page query:
```typescript
export type ArticleWithAnalysis = Article & {
  sources: Source;
  article_analyses: ArticleAnalysis | null;
};
```

### 5. `lib/supabase/queries/articles.ts`

```typescript
// getArticles() — for home page
// Returns analyzed articles ordered by published_at desc, limit 20
// Joins: articles → sources, articles → article_analyses
// Filter: analyzed_at IS NOT NULL

// getArticleById(id) — for detail page
// Returns one article with joined source and analysis
// Returns null if not found
```

Map DB rows to UI types inside the query functions:

**`getArticles()` → `HomeArticle[]`:**
- `id` → `article.id`
- `category` → `source.name`
- `location` → `""`
- `title` → `article.title`
- `imageUrl` → `article.image_url`
- `bias` → `{ left: analysis.left_percentage, center: analysis.center_percentage, right: analysis.right_percentage }`
- `sources` → `1`

**`getArticleById(id)` → `DetailArticle | null`:**
- `id` → `article.id`
- `category` → `source.name`
- `location` → `""`
- `title` → `article.title`
- `author` → `source.name`
- `publishedDate` → formatted `article.published_at`
- `readTime` → word count estimate: `Math.ceil(raw_text.split(/\s+/).length / 200) + " min read"`
- `imageUrl` → `article.image_url`
- `imageCaption` → `""`
- `bias` → framing percentages from analysis (or `{left:33,center:34,right:33}` if no analysis)
- `sources` → `1`
- `body` → split `raw_text` into paragraphs by `\n\n` or newlines, filter empty
- `overallBiasLabel` → `analysis.bias_label` (cast to union) or `"unclear"`
- `overallBiasPercent` → max of left/center/right percentages or `33`
- `summary` → `[analysis.summary]` (wrap in array) or `[]`
- `summaryDate` → formatted `article.analyzed_at` or `""`
- `summaryReadTime` → `""`
- `sourceList` → `[{ name: source.name, bias: mapBiasLabel(analysis.bias_label) }]`
- `relatedIds` → `[]` (pgvector, section 20)

Helper `mapBiasLabel(label)` → `"left" | "center" | "right"`:
- `"left"` | `"center-left"` → `"left"`
- `"center"` → `"center"`
- `"center-right"` | `"right"` → `"right"`
- `"mixed"` | `"unclear"` → `"center"`

### 6. `lib/supabase/queries/sources.ts`

```typescript
// getActiveSources() — returns sources where active = true
// Used by scraping routes in later sections
```

### 7. Update `app/page.tsx`

- Remove `MOCK_ARTICLES` import
- `await getArticles()` (async RSC)
- Show empty state `<p>No articles yet.</p>` when the array is empty
- Keep the same grid layout and `<ArticleCard>` usage

### 8. Update `app/news/[id]/page.tsx`

- Remove `generateStaticParams`, `MOCK_DETAIL_ARTICLES`, `MOCK_ARTICLES`, `getMockDetailArticle` imports
- `await getArticleById(id)`
- Call `notFound()` when null
- `related` → empty array (pgvector not yet enabled)
- Metadata generation uses `getArticleById(id)` result
- Everything else (layout, sidebar, components) unchanged

### 9. Update `.env.example`

Add after Clerk vars:
```
# Supabase — paste from Project Settings → API
# SERVICE_ROLE key is server-only. Do NOT prefix with NEXT_PUBLIC_.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 10. Update `tsconfig.json`

```json
"exclude": ["node_modules", "supabase/functions"]
```

---

## Security requirements

- `SUPABASE_SERVICE_ROLE_KEY` is accessed only in `lib/supabase/service.ts` which has
  `import 'server-only'` — the Next.js bundler will error if any client component imports it.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (anon role) but no browser client is
  created in this step.
- No Supabase service key, Oxylabs creds, OpenAI key, or admin secret is sent to the browser.
- RLS enabled on all tables; public read policies only on display tables.

---

## Acceptance criteria

- [ ] `npm install` succeeds with `@supabase/supabase-js` added
- [ ] `supabase/schema.sql` contains all 6 tables with correct columns and constraints
- [ ] `lib/supabase/service.ts` uses `server-only` and service role key
- [ ] `lib/supabase/types.ts` exports `Database` type and row aliases
- [ ] `lib/supabase/queries/articles.ts` exports `getArticles()` and `getArticleById()`
- [ ] `lib/supabase/queries/sources.ts` exports `getActiveSources()`
- [ ] `app/page.tsx` reads from Supabase; shows empty state when no articles
- [ ] `app/news/[id]/page.tsx` reads from Supabase; no `generateStaticParams`
- [ ] `.env.example` has all three Supabase vars
- [ ] `tsconfig.json` excludes `supabase/functions`
- [ ] `npm run build` or `npx tsc --noEmit` passes with no type errors

---

## Checks to run

```bash
npx tsc --noEmit
npm run lint
```

---

## Manual test steps

After running schema SQL in Supabase Dashboard → SQL Editor:

1. Start dev server: `npm run dev`

2. Open `http://localhost:3000` — expect "No articles yet." (no data yet, not a crash)

3. In Supabase Dashboard → Table Editor, insert one row into `sources`:
   - `name`: "Reuters"
   - `listing_url`: "https://reuters.com"
   - `active`: true

4. Insert one row into `articles` (reference the source id, pick any future `published_at`,
   set `image_url` and `raw_text` to non-empty strings, leave `analyzed_at` null):
   - Home page still shows "No articles yet." (not analyzed)

5. Insert one row into `article_analyses` for that article; then run:
   ```sql
   UPDATE articles SET analyzed_at = now() WHERE id = '<your-article-id>';
   ```

6. Refresh `http://localhost:3000` — the article card appears with source name as category,
   bias meter rendered from analysis percentages.

7. Click the card → `/news/<uuid>` — detail page loads with article body, sidebar analysis,
   and no "Related Stories" section (expected, pgvector not yet enabled).

8. Navigate to a non-existent `/news/bad-id` — Next.js 404 page appears (not a crash).
