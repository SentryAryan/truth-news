# 010 — pgvector & Related Articles

## Goal

Enable pgvector in Supabase, add an `embedding vector(1536)` column to `article_analyses`,
update the AI analysis pipeline to generate and save embeddings alongside each analysis,
add a `getRelatedArticles` query using cosine similarity, and wire up a Related Articles
section on the news details page.

This implements section 20 of AGENTS.md.

---

## Skills read

- `.agents/skills/supabase/SKILL.md` — schema changes, RPC functions, service role queries
- `.agents/skills/next-best-practices/SKILL.md` — async RSC patterns, server/client boundaries

---

## Existing code inspected

| File | Relevant detail |
|------|-----------------|
| `supabase/schema.sql` | Current schema — no `vector` extension, no `embedding` column |
| `lib/supabase/types.ts` | `article_analyses` Row/Insert has no `embedding` field |
| `lib/ai/analyze.ts` | `analyzeArticle()` calls `gpt-4o-mini` via Vercel AI SDK generateObject |
| `lib/ai/pipeline.ts` | `runAnalysisPipeline()` calls `analyzeArticle`, inserts row, sets `analyzed_at` |
| `app/api/analyze/route.ts` | Thin POST route wrapping `runAnalysisPipeline` |
| `lib/supabase/queries/articles.ts` | `getArticleById` returns `DetailArticle` with `relatedIds: []` always |
| `app/news/[id]/page.tsx` | `related: RelatedStory[]` is always `[]` — section renders only when non-empty |
| `components/details/related-story-card.tsx` | Already built, accepts `RelatedStory` |
| `lib/types.ts` | `RelatedStory` type: `{ id, category, location, title, imageUrl, publishedDate, readTime }` |
| `package.json` | `ai@^6.0.206`, `@ai-sdk/openai@^3.0.71` — Vercel AI SDK with `embed()` available |

---

## Decisions / assumptions

1. **Embedding model**: `text-embedding-3-small` (1536 dimensions) via Vercel AI SDK `embed()`.
2. **Text to embed**: `article.title + "\n\n" + article.raw_text.slice(0, 8000)` — keeps token cost low while capturing meaning.
3. **RPC function**: Cosine distance `<=>` is not supported by the supabase-js query builder. A Postgres function `match_related_articles` is created and called via `supabase.rpc()`.
4. **Embedding fetch in page**: A lightweight `getArticleEmbedding(id)` query is added alongside `getArticleById`. Both are called in parallel in the page with `Promise.all`.
5. **IVFFlat index**: Created with `lists = 100`. If the table has fewer than 100 rows when the index is created, Postgres will warn but still create it — this is fine for development.
6. **Existing analyses without embeddings**: `runAnalysisPipeline` will skip articles that already have `analyzed_at` set. Articles analysed before this change have no embedding. A separate backfill pass is outside scope here — the user can call `POST /api/analyze` to re-run only pending articles, or a one-time backfill script can be added later.
7. **`analyzed_at` update**: Only after both analysis insert AND embedding update succeed.
8. **Error handling for embedding**: If embedding generation fails, the analysis row is still saved (without embedding) and `analyzed_at` is still set. A warning is logged. Embeddings can be backfilled separately.
9. **Supabase RPC return type**: `match_related_articles` returns `id`, `title`, `image_url`, `published_at`, `source_name`. The query layer maps these to `RelatedStory`.

---

## SQL to run in Supabase Dashboard → SQL Editor

```sql
-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Add embedding column to article_analyses
alter table article_analyses
  add column if not exists embedding vector(1536);

-- 3. IVFFlat cosine similarity index
create index if not exists article_analyses_embedding_idx
  on article_analyses
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. RPC function for related article lookup
create or replace function match_related_articles(
  p_article_id  uuid,
  p_embedding   vector(1536),
  p_match_count int default 5
)
returns table (
  id           uuid,
  title        text,
  image_url    text,
  published_at timestamptz,
  source_name  text
)
language sql
stable
security invoker
as $$
  select
    a.id,
    a.title,
    a.image_url,
    a.published_at,
    s.name as source_name
  from article_analyses aa
  join articles a on a.id = aa.article_id
  join sources  s on s.id = a.source_id
  where aa.embedding is not null
    and a.analyzed_at is not null
    and a.id <> p_article_id
  order by aa.embedding <=> p_embedding
  limit p_match_count;
$$;
```

---

## Files to change

| File | Change |
|------|--------|
| `supabase/schema.sql` | Append pgvector extension, ALTER column, index, and RPC function |
| `lib/supabase/types.ts` | Add `embedding: number[] \| null` to `article_analyses` Row and Insert |
| `lib/ai/pipeline.ts` | After inserting analysis, generate embedding via `embed()`, update row |
| `lib/supabase/queries/articles.ts` | Add `getArticleEmbedding`, `getRelatedArticles` |
| `app/news/[id]/page.tsx` | Fetch embedding + related articles; render Related Articles section |

---

## Implementation requirements

### `lib/supabase/types.ts`

Add `embedding: number[] | null` to `article_analyses.Row` and `article_analyses.Insert`.
The Supabase JS client returns pgvector values as `number[]` when the column type is declared.

### `lib/ai/pipeline.ts`

Add an `embedArticle(text: string): Promise<number[] | null>` helper:
- Import `embed` from `'ai'` and `createOpenAI` from `'@ai-sdk/openai'`.
- Call `embed({ model: openai.embedding('text-embedding-3-small'), value: text })`.
- Return `embedding` (a `number[]`) or `null` on failure.

Inside the main loop, after successfully inserting the analysis row:
1. Call `embedArticle(article.title + '\n\n' + article.raw_text.slice(0, 8000))`.
2. If embedding succeeds, call `.update({ embedding }).eq('article_id', article.id)` on `article_analyses`.
3. If embedding fails, log a warning but do not block `analyzed_at` update.
4. Call `articles.update({ analyzed_at })` as before.
5. Log whether embedding was saved or skipped.

### `lib/supabase/queries/articles.ts`

Add:

```ts
export async function getArticleEmbedding(id: string): Promise<number[] | null>
```
- Select `article_analyses.embedding` where `article_id = id`.
- Return `data.embedding as number[] | null` or `null` on error/missing.

```ts
export async function getRelatedArticles(
  articleId: string,
  embedding: number[],
): Promise<RelatedStory[]>
```
- Call `supabase.rpc('match_related_articles', { p_article_id: articleId, p_embedding: embedding, p_match_count: 5 })`.
- Map each row to `RelatedStory`: `{ id, category: source_name, location: '', title, imageUrl: image_url, publishedDate: formatDate(published_at), readTime: '' }`.
- Return `[]` on error.

### `app/news/[id]/page.tsx`

- In the page function, after resolving `id`, call both queries in parallel:
  ```ts
  const [article, embedding] = await Promise.all([
    getArticleById(id),
    getArticleEmbedding(id),
  ]);
  ```
- If `embedding` is non-null, call:
  ```ts
  const related = await getRelatedArticles(id, embedding);
  ```
  Otherwise `related = []`.
- The existing `{related.length > 0 && ...}` block already renders `RelatedStoryCard` — no structural changes needed.

---

## Security requirements

- All queries use the service role client (`getServiceClient()`) — server-only, never exposed to browser.
- The RPC function uses `security invoker` — runs with the caller's role (service role), which bypasses RLS. This is correct since embedding search is an internal, server-side operation.
- No new env vars required — `OPENAI_API_KEY` already used by the pipeline.

---

## Acceptance criteria

- [ ] `article_analyses` table has an `embedding vector(1536)` column in Supabase.
- [ ] `match_related_articles` RPC function exists and returns rows ordered by cosine distance.
- [ ] Running `POST /api/analyze` on a pending article generates and saves an embedding.
- [ ] The news details page fetches and displays up to 5 related articles when the current article has an embedding.
- [ ] If the current article has no embedding, the Related Articles section is not shown.
- [ ] TypeScript builds without errors.

---

## Checks to run

```bash
cd /Users/sujatagunale/Documents/company/youtube/biasly
npm run build
npm run lint
```

---

## Manual test steps

1. **Run the SQL** from the "SQL to run" section above in Supabase Dashboard → SQL Editor.
2. Start the dev server: `npm run dev`
3. Analyze at least two pending articles:
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
4. Watch terminal — confirm you see `[analyze] embedding saved` lines for each article.
5. Open any analyzed article at `http://localhost:3000/news/<id>`.
6. If at least 2 articles have embeddings, a **Related Stories** section should appear below the article body with up to 5 cards.
7. Open an article that was analyzed before this change (no embedding). The Related Stories section should not appear.
