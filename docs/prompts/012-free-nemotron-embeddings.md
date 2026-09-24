# 012 — Free Nemotron embeddings switch

## Goal

Replace paid `openai/text-embedding-3-small` (1536-d) with free
`nvidia/nemotron-3-embed-1b:free` (2048-d) via OpenRouter + Vercel AI SDK
`embed()`, migrate pgvector to `vector(2048)`, clear old embeddings for backfill,
and update AGENTS.md / prompts / `.env.sample` as the single source of truth.

## Skills / docs

- `.agents/skills/ai-sdk` — `embed()` via OpenAI-compatible OpenRouter client
- `.agents/skills/supabase` — schema ALTER, RPC, IVFFlat
- AGENTS.md §19–§20 — analysis vs embeddings; pending includes null embedding

## Existing code inspected

| File | Detail |
|------|--------|
| `lib/ai/openrouter.ts` | `DEFAULT_EMBEDDING_MODEL_ID = openai/text-embedding-3-small` |
| `lib/ai/embed-article.ts` | AI SDK `embed()`; no dim length check |
| `supabase/schema.sql` | `embedding vector(1536)`, `match_related_articles(vector(1536))` |
| `AGENTS.md` §20 + facts | Documents 1536 / text-embedding-3-small |
| `docs/prompts/010-…`, `006-…`, `.env.sample` | Same outdated model/dims |

## Decisions

1. Embedding model: `nvidia/nemotron-3-embed-1b:free` (not `openrouter/free` — chat only).
2. Dimensions: **2048** (NVIDIA native).
3. Keep optional `EMBEDDING_MODEL_ID` env override; default is Nemotron free.
4. Reject embeddings whose length ≠ `EMBEDDING_DIMENSIONS`.
5. Null all existing embeddings, ALTER column to `vector(2048)`, recreate index + RPC.
6. Backfill via existing pending path (`POST /api/analyze`).

## Files to change

- `lib/ai/openrouter.ts`, `embed-article.ts`, `embed-article.test.ts`
- `supabase/schema.sql` + live Supabase migration
- `AGENTS.md`, `docs/prompts/010-pgvector-related-articles.md`, `006-supabase-data-layer.md`
- `.env.sample`

## Security

- No secrets in docs or commits; OpenRouter key stays server-only.
- Embedding calls remain server-only (pipeline / analyze route).

Do **not** create an IVFFlat/HNSW index (pgvector ANN max 2000 dims; Nemotron is 2048). Exact `<=>` is used.

## Acceptance

- [ ] Default model id is `nvidia/nemotron-3-embed-1b:free`
- [ ] Schema / RPC use `vector(2048)`; live DB migrated; old vectors null then refilled
- [ ] Docs and `.env.sample` match AGENTS (no text-embedding-3-small / 1536 left for embeddings)
- [ ] No IVFFlat on embedding (2048 > 2000 ANN limit)
- [ ] typecheck, lint, test, build pass
- [ ] OpenRouter Activity shows free Nemotron embeds, not Text Embedding 3 Small

## Checks

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
- `graphify update .`

## Manual test

```bat
curl.exe -X POST http://localhost:3000/api/analyze ^
  -H "x-biasly-admin-secret: YOUR_SECRET" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

Watch the Next.js terminal for embed progress. Confirm Related Articles on `/news/[id]`.
Confirm OpenRouter Activity lists Nemotron Embed 1B (free) at $0.
