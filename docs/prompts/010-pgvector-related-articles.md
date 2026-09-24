# 010 — pgvector & Related Articles

## Goal

Enable pgvector in Supabase, add an `embedding vector(2048)` column to `article_analyses`,
update the AI analysis pipeline to generate and save embeddings alongside each analysis,
add a `getRelatedArticles` query using cosine similarity, and wire up a Related Articles
section on the news details page.

This implements section 20 of AGENTS.md.

---

## Skills read

- `.agents/skills/supabase` — schema changes, RPC functions, service role queries
- `.agents/skills/ai-sdk` — Vercel AI SDK `embed()`, OpenRouter OpenAI-compatible client
- `node_modules/next/dist/docs/` — async RSC patterns, server/client boundaries

---

## Existing code inspected

| File | Relevant detail |
|------|-----------------|
| `supabase/schema.sql` | No `vector` extension, no `embedding` column (deferred from §7) |
| `lib/supabase/types.ts` | `ArticleAnalysisRow` / Insert have no `embedding` field |
| `lib/pipeline/analyze-article.ts` | LLM analysis via OpenRouter `openrouter/free` |
| `lib/pipeline/analyze.ts` | `runAnalysis()` upserts analysis then sets `analyzed_at` |
| `app/api/analyze/route.ts` | Thin POST wrapping `runAnalysis` |
| `lib/supabase/queries/articles.ts` | `getPendingAnalysisArticles` (missing analysis row only); `getArticleWithAnalysis` |
| `app/(site)/news/[id]/page.tsx` | Live detail page; no Related Articles section yet |
| `components/details/related-story-card.tsx` | Built; accepts `RelatedStory` |
| `lib/types/article-display.ts` | `RelatedStory` type |
| `lib/ai/openrouter.ts` | Shared OpenRouter client; analysis model `openrouter/free` |
| `package.json` | `ai`, `@ai-sdk/openai` — `embed()` available |

---

## Decisions / assumptions

1. **Embedding model**: `nvidia/nemotron-3-embed-1b:free` (2048 dims) via OpenRouter + Vercel AI SDK `embed()`. Not `openrouter/free` (chat router). Optional override: `EMBEDDING_MODEL_ID`. See also `docs/prompts/012-free-nemotron-embeddings.md`.
2. **Text to embed**: `article.title + "\n\n" + article.raw_text.slice(0, 8000)`.
3. **RPC**: Cosine distance `<=>` via Postgres function `match_related_articles`, called with `supabase.rpc()`.
4. **Page fetch**: `getArticleWithAnalysis` + `getArticleEmbedding` in parallel; then `getRelatedArticles` if embedding exists.
5. **Index**: No IVFFlat/HNSW — pgvector ANN max is 2000 dims; Nemotron is 2048. Exact `<=>` ordering is used.
6. **Pending / backfill**: An article is pending when there is **no** `article_analyses` row **or** `embedding IS NULL`. If analysis exists, skip LLM and only embed.
7. **`analyzed_at`**: Set only after both analysis and embedding are saved.
8. **Embedding failure**: Count as failed for that article; do not set `analyzed_at`. Analysis row may remain for embedding backfill on the next run.
9. **RelatedStory mapping**: `category` ← `source_name`, `location` ← `""`, `readTime` ← estimated from body when available else `""`.

---

## SQL to run in Supabase Dashboard → SQL Editor

```sql
-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Add embedding column to article_analyses (2048-d for Nemotron free)
alter table public.article_analyses
  add column if not exists embedding vector(2048);

-- 3. No IVFFlat/HNSW: pgvector ANN indexes cap at 2000 dims; Nemotron is 2048.

-- 4. RPC function for related article lookup
create or replace function public.match_related_articles(
  p_article_id  uuid,
  p_embedding   vector(2048),
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
  from public.article_analyses aa
  join public.articles a on a.id = aa.article_id
  join public.sources  s on s.id = a.source_id
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
| `supabase/schema.sql` | pgvector extension, embedding column, index, RPC |
| `lib/supabase/types.ts` | `embedding: number[] \| null` on Row/Insert |
| `lib/ai/openrouter.ts` | `EMBEDDING_MODEL_ID` + `getEmbeddingModelId()` |
| `lib/ai/embed-article.ts` | `embedArticle()` via OpenRouter |
| `lib/supabase/queries/analyses.ts` | `updateArticleEmbedding` |
| `lib/pipeline/analyze.ts` | Embed after analysis; embedding-only backfill; gate `analyzed_at` |
| `lib/supabase/queries/articles.ts` | Pending includes null embedding; `getArticleEmbedding`; `getRelatedArticles` |
| `app/(site)/news/[id]/page.tsx` | Fetch related; render Related Articles section |
| `.env.sample` | Document optional `EMBEDDING_MODEL_ID` |

---

## Implementation requirements

### Pending detection

`getPendingAnalysisArticles` returns articles where analysis is missing **or** `embedding` is null/empty, oldest `scraped_at` first. Return joined analysis when present so the pipeline can skip the LLM.

### Pipeline loop

1. If no analysis → `analyzeArticle` → `upsertArticleAnalysis` (embedding still null).
2. Call `embedArticle(title + "\n\n" + raw_text.slice(0, 8000))`.
3. On success → `updateArticleEmbedding` → `setArticleAnalyzedAt`.
4. On embed failure → fail article; do not set `analyzed_at`.
5. Log `[analyze] embedding saved|failed` and include embed model in log metadata.

### News details page

- Parallel: `getArticleWithAnalysis(id)`, `getArticleEmbedding(id)`.
- If embedding non-null → `getRelatedArticles(id, embedding)`; else `[]`.
- Render “Related Articles” + `RelatedStoryCard` grid only when `related.length > 0`.

---

## Security requirements

- All queries use the service role client — server-only.
- RPC uses `security invoker`; called only from server with service role.
- No secrets in browser code; reuse `OPENROUTER_API_KEY`.

---

## Acceptance criteria

- [ ] `article_analyses` has `embedding vector(2048)` in schema.sql and Supabase.
- [ ] `match_related_articles` RPC returns rows ordered by cosine distance.
- [ ] `POST /api/analyze` generates and saves embeddings; sets `analyzed_at` only after both succeed.
- [ ] Articles with analysis but null embedding are re-picked for embedding backfill (no LLM re-run).
- [ ] News details page shows up to 5 related articles when the current article has an embedding.
- [ ] Related section hidden when embedding is missing or related list is empty.
- [ ] Typecheck, lint, and unit tests pass.

---

## Checks to run

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Manual test steps

1. Run the SQL from the "SQL to run" section in Supabase Dashboard → SQL Editor.
2. Start the dev server: `npm run dev`
3. Analyze pending articles (Windows — use `curl.exe`):

```bash
curl.exe -X POST http://localhost:3000/api/analyze ^
  -H "x-biasly-admin-secret: YOUR_BIASLY_ADMIN_SECRET" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

4. Watch the Next.js terminal for `[analyze] embedding saved` lines.
5. Open an analyzed article at `http://localhost:3000/news/<id>` (signed in).
6. With ≥2 articles that have embeddings, **Related Articles** should appear under the body.
7. An article without an embedding should not show the Related Articles section.
