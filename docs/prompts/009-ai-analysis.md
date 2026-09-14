# 009 — AI Article Analysis Pipeline

## Goal

Implement `POST /api/analyze`: a server-side pipeline that loads all unanalyzed articles from Supabase, calls OpenAI via the Vercel AI SDK to produce structured analysis (summary, sentiment, political framing, loaded terms, disclaimer), validates the output with Zod, saves it to `article_analyses`, and marks each article's `analyzed_at`. Log progress and return a final summary.

---

## Skills read

- `AGENTS.md` — sections 14 (API method rules), 15 (admin secret), 19 (AI analysis spec), 22 (security and standards)
- `.agents/skills/supabase/SKILL.md` — service role client, query patterns
- `.agents/skills/next-best-practices/SKILL.md` — route handlers, server-only modules

---

## Existing code inspected

| File | Relevant details |
|---|---|
| `lib/supabase/types.ts` | `article_analyses` Insert/Row types fully defined. `ArticleWithAnalysis` type present. |
| `lib/supabase/service.ts` | `getServiceClient()` returns service-role Supabase client. |
| `lib/supabase/queries/articles.ts` | `getArticles()` and `getArticleById()` read analyzed articles. No pending-query yet. |
| `lib/scraping/pipeline.ts` | Pattern for logging, batch counters, and final summary object to follow. |
| `app/api/scrape/route.ts` | Pattern for admin secret check and POST handler to follow. |
| `package.json` | `ai` and `@ai-sdk/openai` are NOT installed. Must be added. `zod` is already installed. |

---

## Decisions and assumptions

- Install `ai` and `@ai-sdk/openai` (Vercel AI SDK + OpenAI provider).
- Use `generateObject` from the `ai` package with a Zod schema for structured, validated output in one call.
- Model: `gpt-4o-mini` (fast, cheap, good for structured extraction). Store model name as `gpt-4o-mini`.
- Batch size: 5 articles per batch (avoids Vercel function timeouts). Configurable via `ANALYSIS_BATCH_SIZE` env var.
- Process ALL pending articles (those with `analyzed_at IS NULL`) by default unless `limit` is passed in request body.
- `bias_score` is always derived server-side as `(right_percentage − left_percentage) / 100`. Never trust AI to compute it.
- If AI output fails Zod validation, retry once with the same prompt. If still invalid, mark as failed and continue.
- `analyzed_at` is set only after a valid analysis row is inserted.
- Embeddings are NOT generated in this step (that is section 20 / pgvector).
- No changes to `supabase/schema.sql` or `lib/supabase/types.ts` are needed — the schema already has all required columns.

---

## Files to create or change

| File | Action |
|---|---|
| `lib/ai/schema.ts` | **Create** — Zod schema for AI output + TypeScript inferred type |
| `lib/ai/analyze.ts` | **Create** — `analyzeArticle(article)` function: calls OpenAI, validates output, returns typed result or null |
| `lib/ai/pipeline.ts` | **Create** — `runAnalysisPipeline(options)` orchestrator: loads pending articles, batches, calls analyze, saves results, logs progress |
| `app/api/analyze/route.ts` | **Create** — thin POST route handler with admin secret check |

---

## Implementation requirements

### 1. Install dependencies

```
npm install ai @ai-sdk/openai
```

### 2. `lib/ai/schema.ts`

Define a Zod schema `AnalysisOutputSchema` for the AI structured output:

```ts
{
  summary: z.string()           // neutral 2–4 sentence summary of the article
  sentiment_score: z.number().min(-1).max(1)
  sentiment_label: z.enum(['positive', 'neutral', 'negative'])
  left_percentage: z.number().int().min(0).max(100)
  center_percentage: z.number().int().min(0).max(100)
  right_percentage: z.number().int().min(0).max(100)
  bias_label: z.enum(['left', 'center-left', 'center', 'center-right', 'right', 'mixed', 'unclear'])
  confidence: z.number().min(0).max(1)
  framing_notes: z.string().nullable()   // 1–3 sentences on how the article frames the story
  loaded_terms: z.array(z.string()).nullable()   // politically charged words/phrases found in the text
  disclaimer: z.string().nullable()   // e.g. "AI estimates may not reflect actual editorial intent"
}
```

Add a `.refine()` check that `left_percentage + center_percentage + right_percentage === 100`.

Export `type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>`.

### 3. `lib/ai/analyze.ts`

- Mark with `'server-only'`.
- Import `generateObject` from `'ai'` and `createOpenAI` from `'@ai-sdk/openai'`.
- Instantiate the provider using `process.env.OPENAI_API_KEY`.
- Build a clear system prompt:
  - Emphasize: analyze based on article text only, not source name.
  - Explain each field: summary (neutral), sentiment (-1 to 1), political framing percentages (must sum to 100), bias label matching strongest percentage, confidence (low = unclear), framing_notes (how the article frames the story), loaded_terms (charged language), disclaimer.
  - Include the `'center-left'` and `'center-right'` bias label options explicitly.
- User prompt: include article title and full raw_text (truncated to 12,000 chars to stay within token limits).
- Call `generateObject` with `model`, `schema: AnalysisOutputSchema`, `system`, `prompt`, `temperature: 0`.
- Return `object` on success, `null` on error (log the error).
- Export as `analyzeArticle(article: { id: string; title: string; raw_text: string }): Promise<AnalysisOutput | null>`.

### 4. `lib/ai/pipeline.ts`

- Mark with `'server-only'`.
- Export interface `AnalysisPipelineOptions { limit?: number; articleIds?: string[] }`.
- Export interface `AnalysisSummary { status, total_pending, analyzed, skipped, failed, duration_ms }`.
- Load pending articles: query `articles` where `analyzed_at IS NULL` and `raw_text` is not empty. If `articleIds` provided, filter to those. If `limit` provided, cap total. Order by `published_at DESC`.
- Process in batches of `ANALYSIS_BATCH_SIZE` (default 5). For each article in a batch:
  1. Log `[analyze] Processing: <title>`
  2. Call `analyzeArticle(article)`.
  3. If null, log failure, increment `failed`, continue.
  4. Compute `bias_score = (output.right_percentage - output.left_percentage) / 100`.
  5. Insert into `article_analyses` (use `getServiceClient()`). On unique constraint error (article already analyzed), count as skipped.
  6. On successful insert: update `articles` set `analyzed_at = new Date().toISOString()` where `id = article.id`.
  7. Log `[analyze] ✓ <title> | sentiment: <label> | bias: <label> | confidence: <n>`.
- After each batch: log batch summary (analyzed/failed counts so far).
- Final summary object: `{ status, total_pending, analyzed, skipped, failed, duration_ms }`. Log with `console.log('[analyze] SUMMARY', JSON.stringify(summary, null, 2))`.
- Return the summary.

### 5. `app/api/analyze/route.ts`

```ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisPipeline } from '@/lib/ai/pipeline';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-biasly-admin-secret');
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { limit?: number; articleIds?: string[] } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const summary = await runAnalysisPipeline({
    limit: typeof body.limit === 'number' ? body.limit : undefined,
    articleIds: Array.isArray(body.articleIds) ? body.articleIds : undefined,
  });

  return NextResponse.json(summary);
}
```

---

## Security requirements

- `OPENAI_API_KEY` must only be read in server-only modules. Never expose to browser code.
- `BIASLY_ADMIN_SECRET` check is required on the route — reject with 401 on mismatch or absence.
- `lib/ai/analyze.ts` and `lib/ai/pipeline.ts` must have `'server-only'` at the top.
- Do not log raw article text — only title and truncated status.

---

## Environment variables required

Add to `.env.local` (and `.env.example`):
```
OPENAI_API_KEY=sk-...
```

---

## Acceptance criteria

- [ ] `POST /api/analyze` without the admin secret header returns 401.
- [ ] `POST /api/analyze` with valid secret triggers analysis for all pending articles.
- [ ] Each analyzed article has a row in `article_analyses` with all required fields.
- [ ] `left_percentage + center_percentage + right_percentage === 100` for every saved analysis.
- [ ] `bias_score` is correctly derived (not from AI output).
- [ ] `analyzed_at` is set on each article row after successful analysis.
- [ ] Invalid AI output triggers one retry before marking failed.
- [ ] Articles already analyzed (`analyzed_at` not null) are not reprocessed.
- [ ] Response body contains the summary object (`status`, `total_pending`, `analyzed`, `skipped`, `failed`, `duration_ms`).
- [ ] Server terminal shows per-article progress and final summary.
- [ ] No TypeScript errors or ESLint warnings.

---

## Checks to run

```bash
npx tsc --noEmit
npm run lint
```

---

## Exact manual test steps

1. Start the dev server: `npm run dev`
2. Ensure at least one article exists in Supabase with `analyzed_at = null`.
3. Run the analysis:
```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "x-biasly-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```
4. Watch the terminal for per-article progress logs.
5. Expect a JSON response like:
```json
{
  "status": "completed",
  "total_pending": 5,
  "analyzed": 5,
  "skipped": 0,
  "failed": 0,
  "duration_ms": 18432
}
```
6. Open the home page — articles with `analyzed_at` set should now display bias and sentiment data.
7. Open a news details page — AI summary, sentiment, framing percentages, and framing notes should appear in the sidebar.
8. Test with a limit: `curl ... -d '{"limit": 2}'` — only 2 articles should be processed.
9. Test with no pending articles (run twice) — second run should return `total_pending: 0, analyzed: 0`.
