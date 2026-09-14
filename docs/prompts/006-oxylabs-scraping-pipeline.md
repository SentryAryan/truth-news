# 006 — Oxylabs Scraping Pipeline

## Goal

Implement the full Oxylabs-powered news scraping pipeline behind `POST /api/scrape`.

The route loads active sources from Supabase, scrapes each homepage through Oxylabs,
extracts candidate article links with Cheerio, filters non-article URLs, dedupes
against existing Supabase articles, scrapes article detail pages, validates them, and
inserts only valid articles. A `pipeline_logs` row tracks every run. The route is
protected by the `x-biasly-admin-secret` header.

---

## Skills read

- `.agents/skills/oxylabs-web-scraper/SKILL.md` — realtime endpoint, Basic Auth,
  `universal` source, `render: "html"` for JS-heavy pages, response structure
  `results[0].content`.
- `.agents/skills/oxylabs-web-scraper/examples.md` — JS/Node fetch pattern with
  `Authorization: Basic btoa(user:pass)`.
- `.agents/skills/supabase/SKILL.md` — service-role client, server-only, RLS, no
  `any`-typed queries.
- `.agents/skills/next-best-practices/SKILL.md` — route handlers, server-only modules,
  RSC boundaries.

---

## Existing code inspected

- `supabase/schema.sql` — `sources` has `listing_url` (the homepage entry URL),
  `parser_strategy` (text, default `'generic'`), `is_active`. `articles` has
  `original_url unique`, `canonical_url`, `title`, `image_url`, `published_at`,
  `raw_text`, `analyzed_at`. `pipeline_logs` tracks run stats.
- `lib/supabase/types.ts` — `SourceRow`, `ArticleInsert`, `PipelineLogInsert`.
- `lib/supabase/server.ts` — `createServiceRoleClient()` (server-only).
- `lib/supabase/queries/sources.ts` — `getActiveSources()` already exists.
- `lib/supabase/queries/articles.ts` — `getExistingOriginalUrls(urls)` exists but
  passes all URLs to a single `.in()` — must be replaced with a chunked version
  (max 15 per query, per AGENTS §16). `insertArticles(rows)` exists.
- `lib/supabase/queries/logs.ts` — `createPipelineLog(input)` and
  `completePipelineLog(id, patch)` exist.
- `package.json` — `cheerio` and `@types/cheerio` are **not** installed yet.
  No API routes exist yet.
- `supabase/seed.sql` — five active sources: Reuters, BBC News, The Guardian,
  Fox News, NPR.

---

## Decisions and assumptions

1. **Oxylabs source**: use `"source": "universal"` for all pages (homepage and
   article detail). Do not add `render: "html"` by default; only add it per
   `parser_strategy` when the source explicitly needs JS rendering. For
   `parser_strategy === 'generic'` (all current seed sources), do not use render.

2. **Source-specific candidate URL filters**: implement per-domain article URL
   pattern checks. Reject any URL that is clearly not an article detail page.
   Per-source patterns for seed sources:
   - **Reuters** (`reuters.com`): keep paths matching
     `/[^/]+/[^/]+-[0-9A-Z]{10,}/` (article slugs with IDs) or
     `/[^/]+/[^/]+/[^/]+-[0-9]{4}-[0-9]{2}-[0-9]{2}/` (dated paths).
     Reject: `/world/africa`, `/markets`, `/authors/`, `/world/` (2-segment), etc.
   - **BBC News** (`bbc.com`): keep paths matching `/news/articles/[a-z0-9]+` or
     `/news/[a-z-]+-[0-9]{7,}`. Reject `/news/world`, `/news/uk`, `/sport/`,
     `/live/`, category paths without numeric/slug IDs.
   - **The Guardian** (`theguardian.com`): keep paths with 4+ segments where the
     last segment is a long story slug (e.g. `/world/2025/jan/15/story-title`).
     Reject: `/us/environment`, `/thefilter-us`, 2–3 segment paths.
   - **Fox News** (`foxnews.com`): keep paths matching
     `/[^/]+/[0-9]{4}/[0-9]{2}/[0-9]{2}/[a-z0-9-]+` (dated article paths).
     Reject `/shows/`, `/sports/`, `/live/`, `/video/`, `/games/`.
   - **NPR** (`npr.org`): keep paths matching `/[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]+/`.
     Reject `/sections/`, `/series/`, `/programs/`, `/podcasts/`.
   - **Fallback** for unknown domains: require path depth ≥ 3, contains a segment
     with a digit sequence (year, ID, or date), and does not match common
     non-article patterns (sections, categories, tags, authors, search, live, etc.).

3. **Homepage link extraction**: use Cheerio `$('a[href]')` over the full HTML but
   apply candidate URL checks immediately — no bulk collection of every anchor.
   Extract href, resolve relative URLs to absolute, normalize trailing slashes.

4. **Article page parsing**: extract from detail HTML using Cheerio:
   - **title**: `<h1>` or `<meta property="og:title">`.
   - **image_url**: `<meta property="og:image">` or first `<img>` in article body.
   - **published_at**: `<meta property="article:published_time">` or
     `<time datetime="">` or structured data `datePublished`.
   - **canonical_url**: `<link rel="canonical" href="">`.
   - **raw_text**: extract paragraph text from `<p>` tags inside `<article>`,
     `[role="main"]`, `.article-body`, `.story-body`, `.entry-content`,
     `main`, or fallback to all `<p>` tags. Remove scripts, styles, nav, footer,
     ads, newsletter blocks, subscription blocks, related-content blocks,
     social-share text, and CSS dumps before extracting paragraphs.

5. **Body quality check** (AGENTS §13):
   - Pass if ≥ 3 meaningful paragraphs (each ≥ 30 chars).
   - OR pass if total cleaned character count ≥ 900 with title + image + date + URL.
   - If one large paragraph is returned, split on double-newlines then sentence
     boundaries.

6. **Validation rejects** (AGENTS §13): missing published_at, missing image_url,
   generic or category-style title, body that is mostly headlines or captions,
   canonical URL pointing to a category/listing page.

7. **Dedupe**: chunk URL arrays into groups of ≤ 15 before calling Supabase `.in()`.
   Fix `getExistingOriginalUrls` accordingly in `lib/supabase/queries/articles.ts`.

8. **Limits**: default `limitPerSource = 5`. The caller may pass any positive integer.

9. **Pipeline log**: create a log row with `status: 'running'` at the start; update
   with final counts and `status: 'success' | 'partial_success' | 'failed'` plus
   `finished_at` at the end.

10. **Env vars**: `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `BIASLY_ADMIN_SECRET`.
    All server-only. Never expose to client code.

---

## Files to create / modify

### Create

```
lib/pipeline/oxylabs.ts          — scrapeUrl(url): Promise<string>; server-only;
                                   Basic Auth from OXY_WSA_USERNAME/OXY_WSA_PASSWORD;
                                   throws on non-200 or missing content.

lib/pipeline/parse.ts            — extractCandidateLinks(html, sourceUrl, domain): string[]
                                   isArticleUrl(url, domain): boolean
                                   parseArticlePage(html, url): ParsedArticle | null
                                   cleanBodyText(html): string
                                   splitIntoParagraphs(text): string[]
                                   validateParsedArticle(parsed): ValidationResult

lib/pipeline/scrape.ts           — runScrape(opts): Promise<ScrapeResult>
                                   orchestrates the full pipeline using helpers above

app/api/scrape/route.ts          — POST handler; validates admin secret; calls runScrape;
                                   returns JSON summary
```

### Modify

```
lib/supabase/queries/articles.ts — fix getExistingOriginalUrls to chunk into ≤ 15 URLs
                                   per .in() call using Promise.all over chunks

package.json                     — add cheerio
```

---

## Implementation requirements

### `lib/pipeline/oxylabs.ts`

```typescript
import "server-only";

const OXYLABS_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

export async function scrapeUrl(url: string): Promise<string> {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) {
    throw new Error("Missing OXY_WSA_USERNAME or OXY_WSA_PASSWORD");
  }
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(OXYLABS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({ source: "universal", url }),
  });
  if (!res.ok) {
    throw new Error(`Oxylabs ${res.status} for ${url}`);
  }
  const json = await res.json();
  const content = json?.results?.[0]?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(`Oxylabs returned empty content for ${url}`);
  }
  return content;
}
```

### `lib/pipeline/parse.ts`

- `import "server-only"`.
- Import `cheerio` with `import * as cheerio from "cheerio"`.
- `extractCandidateLinks(html, sourceListingUrl, domain)`:
  - Load HTML with cheerio, iterate all `a[href]`.
  - Resolve each href to absolute URL.
  - Filter: same domain, `isArticleUrl(url, domain) === true`.
  - Normalize: strip `#fragment`, dedupe by URL.
  - Return `string[]` (up to 30 candidates to avoid runaway scraping).
- `isArticleUrl(url, domain)`:
  - Implements per-domain pattern checks as specified in Decisions §2.
  - Returns `boolean`.
- `parseArticlePage(html, pageUrl)`:
  - Extract title, image_url, published_at, canonical_url, raw_text using Cheerio.
  - For published_at: try `<meta property="article:published_time">`, then
    `<time[datetime]>`, then JSON-LD `datePublished`. Parse to ISO string.
  - For raw_text: call `cleanBodyText(html)`.
  - Returns `ParsedArticle | null` (null if cheerio throws).
- `cleanBodyText(html)`:
  - Load HTML, remove: `script`, `style`, `nav`, `footer`, `header`, `aside`,
    `[class*="ad"]`, `[class*="newsletter"]`, `[class*="subscribe"]`,
    `[class*="related"]`, `[class*="most-viewed"]`, `[class*="social"]`.
  - Find article body in: `article`, `[role="main"]`, `.article-body`,
    `.story-body`, `.entry-content`, `main` — first match.
  - Extract `<p>` text, join with `\n\n`.
  - Trim each paragraph. Filter blanks. Return joined string.
- `splitIntoParagraphs(text)`:
  - Split on `\n\n` first. If result is 1 item, split on `. ` sentence boundary
    into ~3-sentence chunks.
  - Filter paragraphs with fewer than 30 chars. Return `string[]`.
- `validateParsedArticle(parsed, pageUrl)`:
  - Checks all AGENTS §13 accept/reject rules.
  - Returns `{ valid: true } | { valid: false; reason: string }`.

### `lib/pipeline/scrape.ts`

- `import "server-only"`.
- Exports `runScrape(opts: ScrapeOptions): Promise<ScrapeResult>`.
- `ScrapeOptions`: `{ sourceIds?: string[]; limitPerSource?: number }`.
- `ScrapeResult`: matches the AGENTS §16 summary object shape.
- Flow:
  1. Load active sources. If `sourceIds` provided, filter to matching IDs.
  2. Create pipeline log row `{ log_type: 'scrape', status: 'running' }`.
  3. For each source (sequential, not parallel — avoid overwhelming Oxylabs):
     a. Scrape `source.listing_url` with `scrapeUrl()`.
     b. Call `extractCandidateLinks(html, source.listing_url, domain)`.
     c. Log candidate count; log per-candidate reject reasons for filtering.
     d. Chunk candidates into groups of ≤ 15; call `getExistingOriginalUrls`
        per chunk; union into one `Set<string>` of already-stored URLs.
     e. Filter out already-stored URLs (duplicates).
     f. For each remaining candidate (up to `limitPerSource` valid inserts):
        - Call `scrapeUrl(candidateUrl)`.
        - Call `parseArticlePage(html, candidateUrl)`.
        - Call `validateParsedArticle(parsed)`.
        - If valid: push to `toInsert[]`.
        - If invalid: record rejection reason.
        - Stop iterating candidates once `limitPerSource` valid articles accumulated.
     g. Call `insertArticles(toInsert)`. Catch and log per-source insert errors.
  4. After all sources, call `completePipelineLog` with final counts and status.
  5. Log the AGENTS §16 summary object to console.
  6. Return `ScrapeResult`.

- Console logging pattern (server-side only):
  ```
  [scrape] started — sources: 5, limitPerSource: 5
  [scrape] reuters.com — fetching homepage
  [scrape] reuters.com — 28 candidates found, 12 rejected (non-article), 0 duplicates
  [scrape] reuters.com — scraping 5 detail pages
  [scrape] reuters.com — inserted 5, rejected 0
  [scrape] summary { status, sourcesChecked, candidatesFound, ... }
  ```

### `app/api/scrape/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { runScrape } from "@/lib/pipeline/scrape";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-biasly-admin-secret");
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limitPerSource: number =
    typeof body.limitPerSource === "number" && body.limitPerSource > 0
      ? body.limitPerSource
      : 5;
  const sourceIds: string[] | undefined = Array.isArray(body.sourceIds)
    ? body.sourceIds
    : undefined;

  try {
    const result = await runScrape({ sourceIds, limitPerSource });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Fix `lib/supabase/queries/articles.ts` — `getExistingOriginalUrls`

Replace the current implementation with a chunked version:

```typescript
export async function getExistingOriginalUrls(
  urls: string[],
): Promise<Set<string>> {
  if (urls.length === 0) return new Set();

  const CHUNK_SIZE = 15;
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    chunks.push(urls.slice(i, i + CHUNK_SIZE));
  }

  const supabase = createServiceRoleClient();
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("articles")
        .select("original_url")
        .in("original_url", chunk),
    ),
  );

  const found = new Set<string>();
  for (const { data, error } of results) {
    if (error) throw new Error(`Failed to check existing URLs: ${error.message}`);
    for (const row of data ?? []) found.add(row.original_url);
  }
  return found;
}
```

---

## New environment variables

Add to `.env.local` and `.env.example`:

```
OXY_WSA_USERNAME=
OXY_WSA_PASSWORD=
BIASLY_ADMIN_SECRET=
```

All three are server-only. Never prefix with `NEXT_PUBLIC_`.

---

## Security requirements

- `lib/pipeline/oxylabs.ts` and `lib/pipeline/scrape.ts` must have
  `import "server-only"` at the top.
- Oxylabs credentials and `BIASLY_ADMIN_SECRET` are read only from server env.
- Route handler rejects missing/invalid secret with `401` before any pipeline work.
- No secrets, raw article bodies, or Oxylabs credentials in pipeline log
  `errors`/`metadata`.
- Never expose Oxylabs or admin vars to browser code.

---

## Acceptance criteria

- `POST /api/scrape` returns `401` when `x-biasly-admin-secret` is missing or wrong.
- `POST /api/scrape` with a valid secret triggers the scraping pipeline.
- Each active source homepage is fetched via Oxylabs `universal` source.
- Candidate links are filtered by `isArticleUrl` before detail scraping.
- Existing articles are deduped with chunked Supabase queries (max 15 per chunk).
- Article detail pages are parsed with Cheerio; `raw_text` is cleaned of scripts,
  styles, ads, and newsletter blocks.
- Only articles passing AGENTS §13 validation (title, image, published date, body
  quality) are inserted.
- A `pipeline_logs` row is created at run start and updated with final counts.
- Console logs a clear summary object at the end of every run.
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

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, run the scrape (watch the dev server terminal for logs):
   ```bash
   export BASE_URL="http://localhost:3000"
   export BIASLY_ADMIN_SECRET="your-secret-here"

   # Scrape all active sources, 5 articles per source
   curl -X POST "$BASE_URL/api/scrape" \
     -H "content-type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{"limitPerSource":5}'
   ```

3. Test 401 rejection:
   ```bash
   curl -X POST "$BASE_URL/api/scrape" \
     -H "content-type: application/json" \
     -d '{"limitPerSource":5}'
   # Expected: {"error":"Unauthorized"} with HTTP 401
   ```

4. Test selected sources (replace with real UUIDs from Supabase):
   ```bash
   curl -X POST "$BASE_URL/api/scrape" \
     -H "content-type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{"sourceIds":["<source-uuid>"],"limitPerSource":3}'
   ```

5. Watch the dev server terminal for log lines:
   ```
   [scrape] started ...
   [scrape] reuters.com — fetching homepage
   ...
   [scrape] summary { status: 'success', articlesInserted: N, ... }
   ```

6. Verify in Supabase Dashboard → Table Editor → `articles` that new rows appeared
   with `title`, `image_url`, `published_at`, and `raw_text` populated.
