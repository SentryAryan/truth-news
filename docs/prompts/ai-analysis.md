# AI article analysis (OpenRouter)

## Goal

Implement `POST /api/analyze`: process pending articles (missing `article_analyses`
row), call OpenRouter via Vercel AI SDK with model `openrouter/free`, validate with
Zod, save analyses, set `analyzed_at`, log a `logs` row. Update AGENTS.md to use
OpenRouter instead of OpenAI. Embeddings / pgvector (§20) out of scope.

## Skills read

- AGENTS.md §14–15, §19, §21–22
- Plan: AI analysis OpenRouter
- Existing scrape admin-secret + logs patterns

## Existing code inspected

- `getPendingAnalysisArticles`, `upsertArticleAnalysis`, `setArticleAnalyzedAt`
- `lib/auth/admin-secret.ts`, `app/api/scrape/route.ts`
- `article_analyses` schema without embedding

## Decisions or assumptions

1. Provider: `@ai-sdk/openai` `createOpenAI` with `baseURL: https://openrouter.ai/api/v1`
2. Env: `OPENROUTER_API_KEY`; model always `openrouter/free`
3. Bias labels: `left|center|right|mixed|unclear` (DB enums)
4. `bias_score` derived server-side
5. Batch via `ANALYSIS_BATCH_SIZE` (default 5); cap each run with `ANALYSIS_MAX_PER_RUN` (default 20); pending query pages until that many unanalyzed articles are found
6. Retry once on invalid AI output

## Files likely to change

Create: `lib/ai/openrouter.ts`, `lib/ai/analysis-schema.ts`, `lib/pipeline/analyze-article.ts`,
`lib/pipeline/analyze.ts`, `app/api/analyze/route.ts`, tests.

Modify: `AGENTS.md`, `.env.sample`, article display / cards.

## Implementation requirements

As in the approved plan and AGENTS §19.

## Security requirements

- `OPENROUTER_API_KEY` server-only
- Admin secret on analyze route
- No AI from client components

## Acceptance criteria

- [x] `POST /api/analyze` works with admin secret
- [x] Analyses saved; `analyzed_at` set only after save
- [x] AGENTS.md / `.env.sample` document OpenRouter + `openrouter/free`
- [x] Home/details show sentiment / framing / disclaimer fields
- [x] typecheck, lint, build, unit tests pass

## Checks to run

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`

## Exact manual test steps

After adding `OPENROUTER_API_KEY` to `.env.local`:

```powershell
curl.exe -X POST http://localhost:3000/api/analyze `
  -H "Content-Type: application/json" `
  -H "x-biasly-admin-secret: YOUR_SECRET" `
  -d '{}'
```

Confirm `article_analyses`, `analyzed_at`, analysis `logs` row, homepage cards.
