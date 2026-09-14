# Article Read Layer — Home Page and News Details Page

## Goal

Replace mock data on the home page and news details page with live Supabase reads.
Create a `lib/display-mappers.ts` file that converts `ArticleWithAnalysis` /
`ArticleWithAnalysisAndSource` DB rows into the existing `HomeArticle` / `DetailsArticle`
display types. Pages remain Server Components reading stored data only — no scraping,
no analysis, no mock fallbacks.

## Skills read

- `.agents/skills/supabase/SKILL.md` — public client (anon key, RLS-restricted), no
  service_role key in page reads, `NEXT_PUBLIC_` is browser-safe for the anon key.
- `.agents/skills/next-best-practices/SKILL.md` → `data-patterns.md` — Server Component
  direct fetch (no route handler needed), `Promise.all` for parallel reads.
  → `async-patterns.md` — `await params` is required in Next.js 15+.

## Existing code inspected

### Pages (both use mock data today)
- `app/page.tsx` — imports `MOCK_ARTICLES`, maps with `<ArticleCard>`.
- `app/news/[id]/page.tsx` — imports `getMockDetail(id)`, calls `notFound()` if missing.
  Renders article content, sidebar panels, and related articles.

### Types
- `lib/types.ts` — display types: `HomeArticle`, `DetailsArticle`, `BiasBreakdown`,
  `SourceWithBias`.
- `lib/supabase/types.ts` — DB types: `ArticleWithAnalysis`, `ArticleRow`,
  `ArticleAnalysisRow`, `SourceRow`, `BiasLabel`.

### Query functions (ready, centralized)
- `getLatestAnalyzedArticles(limit?)` — public client, returns `ArticleWithAnalysis[]`.
- `getArticleWithAnalysis(id)` — public client, returns `ArticleWithAnalysis | null`.
  Does NOT currently join sources. Needs a source join for the details page mapper.

### Mock files (to be removed from pages, kept as files for reference)
- `lib/mock-articles.ts`, `lib/mock-detail.ts` — no longer imported by pages after this step.

## Decisions

No meaningful ambiguity. Assumptions recorded below.

## Assumptions (small, reversible)

### Fields with no DB equivalent
| Display field | DB situation | Mapping |
|---|---|---|
| `category` | Not in DB | Hard-coded to `"News"` |
| `location` | Not in DB | Hard-coded to `"World"` |
| `author` | Not in DB | Use `sources.name` (the publishing outlet) |
| `readTime` | Not in DB | Compute from `raw_text` at ~200 wpm |
| `imageCaption` | Not in DB | Use `article.title` as caption |
| `sources` (count) | Not in DB | `1` (single analysis per article in DB) |
| `BiasBreakdown` percentages | DB has per-article `bias_label` | Derive via `deriveBiasBreakdown()` lookup table |
| `sourceBreakdown.leftCount/centerCount/rightCount` | Not in DB | Derived from single `bias_label` |
| `sourceBreakdown.topSources` | Not in DB | Single entry: `[{ name: sourceName, biasLabel: simplifiedLabel }]` |
| `analysis.overallBiasDisplay` | Not explicit in DB | `"${color} ${pct}%"` using `biasBreakdown` + color |
| `analysis.summaryPoints` | DB has single `summary` string | Split into sentences |
| `relatedArticles` | Separate fetch | `getLatestAnalyzedArticles(6)` minus the current article |

### Bias breakdown lookup table
```
"left"          → { left: 70, center: 20, right: 10 }
"center-left"   → { left: 40, center: 45, right: 15 }
"center"        → { left: 20, center: 60, right: 20 }
"center-right"  → { left: 15, center: 45, right: 40 }
"right"         → { left: 10, center: 20, right: 70 }
"unclear"       → { left: 33, center: 34, right: 33 }
```

### Image fallback
`https://picsum.photos/seed/${article.id.slice(0, 8)}/800/500` — same deterministic
strategy as `mock-articles.ts`.

### Empty state (home page)
If no analyzed articles exist yet, render a short empty-state message instead of the grid
("No analyzed articles yet." in muted text). No mock fallback.

### `notFound()` on details page
If `getArticleWithAnalysis(id)` returns null or the article has no analysis, call `notFound()`.

## Files to create / modify

**Create:**
- `lib/display-mappers.ts` — all mapper and helper functions.

**Modify:**
- `lib/supabase/types.ts` — add `ArticleWithAnalysisAndSource` type.
- `lib/supabase/queries/articles.ts` — update `getArticleWithAnalysis` to join
  `sources(id, name, logo_url)` and return `ArticleWithAnalysisAndSource | null`.
  Update the export in `queries/index.ts`.
- `app/page.tsx` — replace `MOCK_ARTICLES` import with real fetch + mapper.
- `app/news/[id]/page.tsx` — replace `getMockDetail` with real fetch + mapper.

## Implementation requirements

### 1. `lib/supabase/types.ts` — add new type at the bottom

```ts
/** Article with its analysis and source name — used by the details page. */
export type ArticleWithAnalysisAndSource = ArticleRow & {
  article_analyses: ArticleAnalysisRow | null;
  sources: Pick<SourceRow, "id" | "name" | "logo_url"> | null;
};
```

### 2. `lib/supabase/queries/articles.ts` — update `getArticleWithAnalysis`

Change select to `"*, article_analyses(*), sources(id, name, logo_url)"`.
Change return type to `ArticleWithAnalysisAndSource | null`.
Update the cast at the return.

### 3. `lib/supabase/queries/index.ts` — re-export updated type

No new exports needed — the function name is unchanged.

### 4. `lib/display-mappers.ts`

```ts
import type { BiasLabel, ArticleWithAnalysis, ArticleWithAnalysisAndSource } from "@/lib/supabase/types";
import type { BiasBreakdown, HomeArticle, DetailsArticle } from "@/lib/types";
```

**Private helpers (not exported):**

`deriveBiasBreakdown(label: BiasLabel): BiasBreakdown`
— lookup table as per assumptions above.

`biasLabelToColor(label: BiasLabel): "left" | "center" | "right"`
— "left"|"center-left" → "left"; "center" → "center"; "center-right"|"right" → "right"; "unclear" → "center".

`biasLabelToSimple(label: BiasLabel): "left" | "center" | "right" | "unclear"`
— "left"|"center-left" → "left"; "center" → "center"; "center-right"|"right" → "right"; "unclear" → "unclear".

`formatBiasDisplay(label: BiasLabel): string`
— const bias = deriveBiasBreakdown(label); const color = biasLabelToColor(label);
const pct = color === "left" ? bias.left : color === "right" ? bias.right : bias.center;
return `${color.charAt(0).toUpperCase() + color.slice(1)} ${pct}%`.

`computeReadTime(text: string): string`
— const words = text.trim().split(/\s+/).length; return `${Math.max(1, Math.ceil(words / 200))} min read`.

`formatPublishedAt(dateStr: string | null): string`
— if null return "Recently"; use `new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })`.

`toSummaryPoints(summary: string): string[]`
— split by regex `/(?<=[.!?])\s+/` (lookbehind) or `.split(". ")` with period appended;
filter empty; return array of trimmed sentences.

`splitIntoParagraphs(text: string): string[]`
— split by `/\n\n+/`; fall back to `/\n+/` if only one paragraph; filter empty strings.

`fallbackImage(id: string): string`
— return `https://picsum.photos/seed/${id.slice(0, 8)}/800/500`.

**Exported mappers:**

`articleToHomeArticle(article: ArticleWithAnalysis): HomeArticle`
— maps id, title, imageUrl (image_url ?? fallbackImage), bias (from analysis?.bias_label),
category "News", location "World", sources 1.
— If no analysis, use { left: 33, center: 34, right: 33 } as bias.

`articleToDetailsArticle(article: ArticleWithAnalysisAndSource, related: ArticleWithAnalysis[]): DetailsArticle`
— All HomeArticle fields plus:
  author: article.sources?.name ?? "Staff Reporter"
  publishedAt: formatPublishedAt(article.published_at)
  readTime: computeReadTime(article.raw_text)
  imageCaption: article.title
  bodyParagraphs: splitIntoParagraphs(article.raw_text)
  analysis: (requires article_analyses to be non-null — caller must guard)
    overallBiasDisplay: formatBiasDisplay(analysis.bias_label)
    overallBiasColor: biasLabelToColor(analysis.bias_label)
    summaryPoints: toSummaryPoints(analysis.summary)
    disclaimer: analysis.disclaimer
    confidence: analysis.confidence
    framingNotes: analysis.framing_notes
    loadedTerms: analysis.loaded_terms
    sentimentLabel: analysis.sentiment_label
  sourceBreakdown:
    const color = biasLabelToColor(analysis.bias_label)
    leftCount: color === "left" ? 1 : 0
    centerCount: color === "center" ? 1 : 0
    rightCount: color === "right" ? 1 : 0
    topSources: [{ name: article.sources?.name ?? "Unknown", biasLabel: biasLabelToSimple(analysis.bias_label) }]
  relatedArticles: related.map(articleToHomeArticle)

### 5. `app/page.tsx` — replace mock import

- Make the component `async`.
- Import `getLatestAnalyzedArticles` from `"@/lib/supabase/queries"`.
- Import `articleToHomeArticle` from `"@/lib/display-mappers"`.
- Call `const rows = await getLatestAnalyzedArticles();` and map to `HomeArticle[]`.
- Remove `MOCK_ARTICLES` import.
- If `articles.length === 0` render an empty-state paragraph instead of the grid:
  `<p className="text-body-sm text-text-secondary">No analyzed articles yet.</p>`

### 6. `app/news/[id]/page.tsx` — replace mock import

- Keep the component `async` (it already is).
- Import `getArticleWithAnalysis` from `"@/lib/supabase/queries"`.
- Import `getLatestAnalyzedArticles` from `"@/lib/supabase/queries"`.
- Import `articleToDetailsArticle` from `"@/lib/display-mappers"`.
- `const { id } = await params;` (already done).
- Fetch in parallel:
  ```ts
  const [raw, relatedRaw] = await Promise.all([
    getArticleWithAnalysis(id),
    getLatestAnalyzedArticles(6),
  ]);
  ```
- If `!raw || !raw.article_analyses` → call `notFound()`.
- Filter related: `relatedRaw.filter((r) => r.id !== id).slice(0, 4)`.
- Map: `const article = articleToDetailsArticle(raw, related);`
- Remove `getMockDetail` import.
- All template variables are unchanged (the `article` shape is the same `DetailsArticle` type).

## Security requirements

- Pages use the public (anon) Supabase client — RLS ensures only analyzed articles and
  active sources are readable. No service_role key in page code.
- `raw_text` (article body) is read from a publicly readable row — acceptable per the
  assumption recorded in `prompts/003-supabase-schema-and-data-layer.md`.
- No scraping, analysis, or mutation in page render (AGENTS §6, §20).

## Acceptance criteria

- `app/page.tsx` and `app/news/[id]/page.tsx` no longer import from `mock-articles` or
  `mock-detail`.
- Home page renders `ArticleCard` list from `getLatestAnalyzedArticles()` (or the empty
  state if no articles exist).
- Details page renders from `getArticleWithAnalysis(id)` + `articleToDetailsArticle()`;
  `notFound()` for missing/unanalyzed articles.
- `getArticleWithAnalysis` returns `ArticleWithAnalysisAndSource | null` including the
  joined source row.
- `lib/display-mappers.ts` exports `articleToHomeArticle` and `articleToDetailsArticle`
  with no `any` types.
- `npm run lint` and `npm run build` pass.
- With a connected Supabase project (seeded sources + scraped + analyzed articles),
  the home page shows live cards and the details page shows full analysis.

## Checks to run

- `npm run lint`
- `npm run build`
