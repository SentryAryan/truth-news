# 007 — AI Article Analysis Pipeline

## Goal

Implement the full AI-powered article analysis pipeline behind `POST /api/analyze`.

The route loads all articles with `analyzed_at = null`, sends each article's text to
OpenAI via the Vercel AI SDK, validates the structured output with Zod, saves the
analysis to `article_analyses`, and stamps `analyzed_at` on the article. A
`pipeline_logs` row tracks every run. The route is protected by the
`x-biasly-admin-secret` header.

---

## Skills read

- `.agents/skills/supabase/SKILL.md` — service-role client, server-only, no secrets in
  errors/metadata, verify schema changes before implementation.
- `.agents/skills/next-best-practices/SKILL.md` — route handlers, server-only modules,
  `maxDuration` export for long-running routes.

---

## Existing code inspected

- `supabase/schema.sql` — `article_analyses` already has `summary text not null`,
  `sentiment_score`, `sentiment_label`, `bias_score`, `bias_label`, `confidence`,
  `framing_notes`, `loaded_terms`, `disclaimer`, `model`. It does **not** have
  `left_percentage`, `center_percentage`, `right_percentage` columns.
  The `bias_label` enum has `left | center-left | center | center-right | right |
  unclear` but is missing `mixed` (required by AGENTS §19).
- `lib/supabase/types.ts` — `ArticleAnalysisRow` already has `summary: string` and
  `BiasLabel` type. Missing: `left_percentage`, `center_percentage`,
  `right_percentage` fields. `BiasLabel` needs `"mixed"` added.
- `lib/supabase/queries/articles.ts` — `getUnanalyzedArticles(limit)` and
  `setArticleAnalyzedAt(id, at)` exist.
- `lib/supabase/queries/analyses.ts` — `upsertArticleAnalysis(row)` exists.
- `lib/supabase/queries/logs.ts` — `createPipelineLog` and `completePipelineLog` exist.
- `package.json` — `ai`, `@ai-sdk/openai`, and `zod` are **not** installed yet.
  `OPENAI_API_KEY` is already set in `.env.local`.

---

## Schema migration (run in Supabase Dashboard before testing)

Two changes required — paste this SQL into the Supabase Dashboard → SQL Editor and run:

```sql
-- 1. Add 'mixed' to the bias_label enum
ALTER TYPE bias_label ADD VALUE IF NOT EXISTS 'mixed';

-- 2. Add percentage columns to article_analyses
ALTER TABLE article_analyses
  ADD COLUMN IF NOT EXISTS left_percentage   double precision NOT NULL DEFAULT 0
    CHECK (left_percentage   >= 0 AND left_percentage   <= 100),
  ADD COLUMN IF NOT EXISTS center_percentage double precision NOT NULL DEFAULT 0
    CHECK (center_percentage >= 0 AND center_percentage <= 100),
  ADD COLUMN IF NOT EXISTS right_percentage  double precision NOT NULL DEFAULT 0
    CHECK (right_percentage  >= 0 AND right_percentage  <= 100);
```

Also update `supabase/schema.sql` to keep the file in sync (add the same columns and
enum value to the definition — do not re-run schema.sql, it's for reference only).

---

## Decisions and assumptions

1. **AI model**: use `gpt-4o-mini` as the default. Configurable via `OPENAI_MODEL` env
   var; fall back to `"gpt-4o-mini"` if unset.

2. **Vercel AI SDK `generateObject`**: use structured output (JSON schema via Zod) for
   reliable parsing. Import from `"ai"` and `"@ai-sdk/openai"`.

3. **`bias_score` derivation**: compute as `(rightPercentage - leftPercentage) / 100`
   so the existing `-1 to 1` column remains useful. -1 = fully left, +1 = fully right.

4. **Zod validation + retry**: validate AI output with Zod. If the output fails
   validation (e.g., percentages don't sum to 100, label mismatch), retry once with
   an amended prompt noting the specific failure. If still invalid, mark the article
   as failed and move on without saving any analysis row.

5. **Percent sum tolerance**: allow ±2 rounding tolerance (i.e., accept 98–102).
   Before saving, normalize the three percentages to sum to exactly 100 by adjusting
   the largest one.

6. **Batching**: process articles in batches of `batchSize` (default 5). After each
   inner batch, check if more unanalyzed articles remain and continue until none are
   left (or `maxArticles` cap is reached, default unlimited). This avoids a single
   massive DB query while still processing everything.

7. **`maxDuration`**: export `export const maxDuration = 300;` in the route handler
   (5-minute Vercel function timeout).

8. **`analyzed_at`**: set only after the analysis row is successfully upserted.
   If `upsertArticleAnalysis` throws, do not set `analyzed_at`.

9. **System prompt**: neutral, non-opinionated. Instructs the model to use article
   text only — never infer framing from source name. Requires evidence-based framing
   notes. Requires `mixed` when framing cues are roughly balanced.

10. **Pipeline log**: `log_type: 'analysis'`. Track `articles_analyzed` in final patch.

---

## Files to create / modify

### Create

```
lib/pipeline/analyze.ts       — AI analysis orchestrator; server-only
app/api/analyze/route.ts      — POST handler with admin secret guard
```

### Modify

```
supabase/schema.sql           — add percentage columns + 'mixed' enum value (reference only)
lib/supabase/types.ts         — add left_percentage/center_percentage/right_percentage to
                                ArticleAnalysisRow; add "mixed" to BiasLabel; mark new
                                columns optional in ArticleAnalysisInsert defaults
package.json                  — add ai, @ai-sdk/openai, zod
```

---

## Implementation requirements

### `lib/pipeline/analyze.ts`

```typescript
import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
// ... supabase query imports
```

**Zod schema** (`analysisOutputSchema`):
```typescript
const analysisOutputSchema = z.object({
  summary: z.string().min(10),
  sentimentScore: z.number().min(-1).max(1),
  sentimentLabel: z.enum(["positive", "neutral", "negative"]),
  politicalFramingLabel: z.enum(["left", "center", "right", "mixed", "unclear"]),
  leftPercentage: z.number().min(0).max(100),
  centerPercentage: z.number().min(0).max(100),
  rightPercentage: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  framingNotes: z.array(z.string()).min(1).max(6),
  loadedTerms: z.array(z.string()),
  disclaimer: z.string().min(10),
}).refine(
  (d) => Math.abs(d.leftPercentage + d.centerPercentage + d.rightPercentage - 100) <= 2,
  { message: "percentages must sum to 100" },
);
```

**System prompt** (constant string):
```
You are a neutral political framing analyst. Your job is to analyze a news article
and return structured analysis JSON. Do not add any other text.

Rules:
- Use ONLY the article text as evidence. Never infer framing from the news source name.
- summary: 2–3 neutral sentences summarizing the article's key facts.
- sentimentScore: float from -1 (very negative) to 1 (very positive).
- sentimentLabel: "positive", "neutral", or "negative".
- leftPercentage, centerPercentage, rightPercentage: estimate the % of framing cues
  that lean left, center, or right. Must sum to exactly 100.
- politicalFramingLabel: the dominant label. Use "left" if leftPercentage is highest,
  "right" if rightPercentage is highest, "center" if centerPercentage is highest,
  "mixed" if left and right are within 10 points of each other and both > 20,
  "unclear" if the article is factual/objective with little political language.
- confidence: your confidence in the framing estimate (0–1). Use low confidence for
  objective news or when evidence is weak.
- framingNotes: 2–4 bullet strings explaining specific language, word choices, or
  rhetorical patterns you observed.
- loadedTerms: emotionally or politically charged words or phrases found in the text.
  Empty array if none.
- disclaimer: must include "This is an AI-estimated analysis and may not reflect the
  article's actual intent or the publisher's editorial position."
```

**`analyzeArticle(article: ArticleRow, attempt = 1)`**:
- Call `generateObject` with the system prompt, `model: openai(modelId)`,
  `schema: analysisOutputSchema`, and a user message containing the article title
  and `raw_text` (truncated to 8000 chars to avoid token overruns).
- On Zod validation failure (the refine check), retry once with `attempt = 2` and
  an amended user message noting the error.
- On second failure or any other error, throw so the caller can mark the article
  as failed.
- Returns the validated object.

**`normalizePcts(left, center, right)`**:
- If sum ≠ 100, adjust the largest value so they sum to exactly 100.
- Returns `{ left, center, right }` as integers.

**`runAnalyze(opts: AnalyzeOptions): Promise<AnalyzeResult>`**:
- `AnalyzeOptions`: `{ batchSize?: number; maxArticles?: number; articleIds?: string[] }`
- `AnalyzeResult`: `{ status, articlesAnalyzed, articlesFailed, articlesSkipped, remaining, durationMs }`
- Flow:
  1. Create pipeline log `{ log_type: 'analysis', status: 'running' }`.
  2. Outer loop: load `batchSize` (default 5) unanalyzed articles.
     If `articleIds` provided, filter to those IDs.
  3. For each article in the batch:
     - Call `analyzeArticle(article)`.
     - Normalize percentages.
     - Compute `bias_score = (right - left) / 100`.
     - Call `upsertArticleAnalysis({ article_id, summary, sentiment_score,
       sentiment_label, bias_score, bias_label: politicalFramingLabel,
       left_percentage, center_percentage, right_percentage, confidence,
       framing_notes: framingNotes, loaded_terms: loadedTerms, disclaimer,
       model: modelId })`.
     - On success: call `setArticleAnalyzedAt(id, new Date().toISOString())`.
     - On error: increment failed count, log warning, continue.
  4. After batch: check if more unanalyzed remain (or `maxArticles` reached).
     Continue outer loop if yes.
  5. Finalize pipeline log with `articles_analyzed` count and status.
  6. Log console summary.
  7. Return `AnalyzeResult`.

**Console log pattern**:
```
[analyze] started — pending articles: N, batchSize: 5
[analyze] batch 1 — analyzing 5 articles
[analyze] article "<title>" — analyzed (sentiment: positive, framing: center, conf: 0.82)
[analyze] article "<title>" — failed: <reason>
[analyze] batch 1 done — analyzed: 5, failed: 0
[analyze] summary { status: 'success', articlesAnalyzed: N, ... }
```

### `app/api/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { runAnalyze } from "@/lib/pipeline/analyze";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = typeof body.batchSize === "number" ? body.batchSize : 5;
  const maxArticles = typeof body.maxArticles === "number" ? body.maxArticles : undefined;
  const articleIds = Array.isArray(body.articleIds) ? body.articleIds : undefined;

  try {
    const result = await runAnalyze({ batchSize, maxArticles, articleIds });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[POST /api/analyze] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### `lib/supabase/types.ts` changes

1. Add `"mixed"` to `BiasLabel` union.
2. Add to `ArticleAnalysisRow`:
   ```typescript
   left_percentage: number;
   center_percentage: number;
   right_percentage: number;
   ```
3. Add to `ArticleAnalysisInsert` defaults:
   ```typescript
   | "left_percentage" | "center_percentage" | "right_percentage"
   ```

---

## New environment variable

Add to `.env.example` (already set in `.env.local`):

```
# Optional: override the OpenAI model used for analysis (default: gpt-4o-mini)
OPENAI_MODEL=
```

---

## Security requirements

- `lib/pipeline/analyze.ts` must have `import "server-only"` at the top.
- `OPENAI_API_KEY` and `BIASLY_ADMIN_SECRET` are read only from server env.
- Never log article text, API keys, or secrets in pipeline log `errors`/`metadata`.
- Route rejects missing/invalid secret with `401` before any work begins.

---

## Acceptance criteria

- `POST /api/analyze` returns `401` for missing/wrong secret.
- With valid secret, the route processes all unanalyzed articles.
- Each article's AI output is validated with Zod before saving.
- Failed validation triggers one retry; second failure skips without saving.
- `article_analyses` row contains: `summary`, `sentiment_score`, `sentiment_label`,
  `bias_score`, `bias_label` (= `politicalFramingLabel`), `left_percentage`,
  `center_percentage`, `right_percentage`, `confidence`, `framing_notes`,
  `loaded_terms`, `disclaimer`, `model`.
- `analyzed_at` is set on the article only after the analysis row is successfully saved.
- `pipeline_logs` row is created at start and finalized with counts.
- Console shows per-article progress and a final summary object.
- `npm run lint` passes.
- `npm run build` passes.

---

## Checks to run

```bash
npm run lint
npm run build
```

---

## Manual test steps

1. Run the schema migration SQL in Supabase Dashboard → SQL Editor.

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. First run the scraper to populate articles (if not already done):
   ```bash
   export BASE_URL="http://localhost:3000"
   export BIASLY_ADMIN_SECRET="hello"

   curl -X POST "$BASE_URL/api/scrape" \
     -H "content-type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{"limitPerSource":3}'
   ```

4. Run analysis on all pending articles (watch dev server terminal for logs):
   ```bash
   curl -X POST "$BASE_URL/api/analyze" \
     -H "content-type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{}'
   ```

5. Test 401 rejection:
   ```bash
   curl -X POST "$BASE_URL/api/analyze" \
     -H "content-type: application/json" \
     -d '{}'
   # Expected: {"error":"Unauthorized"} with HTTP 401
   ```

6. Test with a batch size limit:
   ```bash
   curl -X POST "$BASE_URL/api/analyze" \
     -H "content-type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{"batchSize":2,"maxArticles":4}'
   ```

7. Watch dev server terminal for:
   ```
   [analyze] started — pending articles: N, batchSize: 5
   [analyze] article "..." — analyzed (sentiment: neutral, framing: center, conf: 0.75)
   [analyze] summary { status: 'success', articlesAnalyzed: N, ... }
   ```

8. Verify in Supabase Dashboard → `article_analyses` that rows have `summary`,
   `left_percentage`, `center_percentage`, `right_percentage` populated.
   Check `articles` that `analyzed_at` is now set.
