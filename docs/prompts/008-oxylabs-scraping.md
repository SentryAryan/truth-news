# 008 — Oxylabs Scraping Pipeline

## Goal

Implement the manual scraping pipeline (`POST /api/scrape`) that:

1. Loads active sources from Supabase.
2. Scrapes each source homepage via the Oxylabs Web Scraper API.
3. Extracts candidate article links from homepage HTML using Cheerio.
4. Filters candidates with source-specific URL rules (rejects sections, categories, live pages, etc.).
5. Dedupes against existing Supabase article URLs (in chunks ≤ 15).
6. Scrapes article detail pages via Oxylabs.
7. Validates and cleans each article (title, published date, image URL, body quality).
8. Inserts valid articles to Supabase.
9. Returns and logs a full scrape summary.

---

## Skills read

- `.agents/skills/oxylabs-web-scraper/SKILL.md` — Oxylabs endpoint, auth, response shape
- `.agents/skills/supabase/SKILL.md` — service role client, query patterns, `.in()` chunk rule
- `.agents/skills/next-best-practices/SKILL.md` — route handler patterns, server-only modules

---

## Existing code inspected

| File | Relevant detail |
|---|---|
| `lib/supabase/service.ts` | `getServiceClient()` — server-only, service role key |
| `lib/supabase/types.ts` | `Source`, `Article` row types |
| `lib/supabase/queries/sources.ts` | `getActiveSources()` already implemented |
| `supabase/schema.sql` | `articles.original_url` is UNIQUE — used for dedupe |
| `scripts/seed-sources.ts` | 5 seeded sources: Reuters, BBC News, NPR, The Guardian, Fox News |
| `package.json` | `cheerio` not yet installed; needs to be added |
| `.env.local` | `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `BIASLY_ADMIN_SECRET` present |
| `app/api/scrape/` | Directory exists, no `route.ts` yet |
| `lib/scraping/` | Directory does not exist yet |
| `next.config.ts` | `images.remotePatterns` only allows `picsum.photos` — must add all news source domains |

---

## Decisions and assumptions

1. **Oxylabs source**: `"universal"` with `render: "html"` for all URLs. JS-heavy homepages (Reuters, Guardian) need rendering. Realtime endpoint (`https://realtime.oxylabs.io/v1/queries`) with HTTP Basic Auth.

2. **Default limits**: all active sources, up to 5 valid articles per source. Caller may pass `{ sourceIds, limit }` in POST body to override.

3. **Source-specific URL filters** for the 5 seeded sources. The filter is applied before any detail scrape. Pattern rules per hostname:

   | Hostname | Accept patterns | Reject patterns |
   |---|---|---|
   | `reuters.com` | Path ≥ 4 segments with long slug at end (e.g. `/world/us/trump-signs-exec-order-2024-01-20/`) | ≤ 3 segments (`/world/africa`), `/graphics/`, `/video/` |
   | `bbc.com` | `/news/articles/...` or `/news/[slug]-[8+digits]` | `/sport/`, `/sounds/`, `/weather/`, live pages, ≤ 2 news segments |
   | `npr.org` | Date-based `/{yyyy}/{mm}/{dd}/{id}/slug` | `/sections/`, `/music/`, `/podcasts/`, `/series/`, `/about/` |
   | `theguardian.com` | Section + `/{yyyy}/{mon}/{dd}/slug` (4+ path segments with date) | 1–2 segment paths (`/us`, `/world`), `/thefilter`, `/newsletters` |
   | `foxnews.com` | `/[section]/[long-slug]` where slug length ≥ 20 chars and has multiple hyphens | `/shows/`, `/live/`, `/sports/`, `/entertainment/games/`, `/category/` |

   General fallback (any host not in the above list): reject if path segments ≤ 1, or path matches `/sections?/`, `/categor(y|ies)/`, `/tags?/`, `/topics?/`, `/author/`, `/search`, `/live`.

4. **Cheerio link extraction**: only extract `<a>` tags with `href` found inside article-card containers. Use broad content selectors: `article a`, `[class*="card"] a`, `[class*="story"] a`, `[class*="article"] a`, `main a`, `h2 a`, `h3 a`. Dedupe URLs. Normalize relative paths to absolute.

5. **Article detail extraction** with Cheerio (in priority order):
   - **Title**: `og:title` meta → `article:title` meta → first `<h1>`
   - **Published date**: `article:published_time` meta → `datePublished` JSON-LD → `<time[datetime]>` → `og:article:published_time`
   - **Image URL**: `og:image` meta → `twitter:image` meta → first `<img>` inside `<article>` or `<main>` with `src` matching `https://`
   - **Body text**: strip `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<noscript>` from `<article>` or `<main>`. Then collect `<p>` tags and clean them. Join with `\n\n`.

6. **Body quality**: pass if ≥ 3 non-empty paragraphs OR ≥ 900 characters after cleanup. If only 1 paragraph, attempt sentence split before rejecting.

7. **Text cleanup before saving**: remove JS error text, CSS class dumps, ad placeholders, "related articles" sections, newsletter blocks, social share text, "load more", subscription prompts.

8. **Dedupe**: query `articles.original_url` in chunks of exactly 15 using `.in()`. Skip any URL already stored.

9. **Canonical URL**: read from `link[rel="canonical"]` or `og:url` meta. Fall back to the scraped URL itself.

10. **Console logging**: structured log lines at every stage (per AGENTS.md §16). Final summary object logged and returned in API response.

11. **`next.config.ts` image hostnames**: add `*.reuters.com`, `*.bbc.com`, `*.bbci.co.uk`, `*.npr.org`, `*.theguardian.com`, `*.guim.co.uk`, `*.foxnews.com`, `a57.foxnews.com` to `remotePatterns`.

---

## Files likely to change

### New files

| File | Purpose |
|---|---|
| `lib/scraping/oxylabs.ts` | `scrapeUrl(url)` — calls Oxylabs realtime API, returns HTML string |
| `lib/scraping/extractor.ts` | `extractLinks(html, baseUrl)` — Cheerio link extraction from homepage |
| `lib/scraping/filter.ts` | `isArticleUrl(url, source)` — source-specific candidate URL filter |
| `lib/scraping/validator.ts` | `parseArticlePage(html, url, source)` — extracts and validates article fields, cleans text |
| `lib/scraping/pipeline.ts` | `runScrapePipeline(options)` — full orchestration, Supabase insert |
| `app/api/scrape/route.ts` | `POST /api/scrape` — admin secret check, calls pipeline, returns summary |

### Modified files

| File | Change |
|---|---|
| `package.json` | Add `cheerio` |
| `next.config.ts` | Add news source hostnames to `images.remotePatterns` |

---

## Implementation requirements

### 1. Install cheerio

```bash
npm install cheerio
```

### 2. `lib/scraping/oxylabs.ts`

```typescript
import 'server-only';

const OXY_ENDPOINT = 'https://realtime.oxylabs.io/v1/queries';

export async function scrapeUrl(url: string): Promise<string> {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) throw new Error('Oxylabs credentials not configured');

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch(OXY_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'universal',
      url,
      render: 'html',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Oxylabs error ${res.status}: ${body}`);
  }

  const data = await res.json() as { results: Array<{ content: string; status_code: number }> };
  const result = data.results?.[0];
  if (!result) throw new Error(`No result returned for ${url}`);
  if (result.status_code !== 200) throw new Error(`Target returned HTTP ${result.status_code} for ${url}`);

  return result.content;
}
```

### 3. `lib/scraping/extractor.ts`

```typescript
import 'server-only';
import { load } from 'cheerio';

const ARTICLE_SELECTORS = [
  'article a[href]',
  '[class*="card"] a[href]',
  '[class*="story"] a[href]',
  '[class*="article"] a[href]',
  '[class*="headline"] a[href]',
  '[class*="teaser"] a[href]',
  'main h2 a[href]',
  'main h3 a[href]',
  'main h4 a[href]',
];

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const links: string[] = [];

  for (const selector of ARTICLE_SELECTORS) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

      try {
        const absolute = new URL(href, base).href;
        // Only same-origin links
        const parsed = new URL(absolute);
        if (parsed.hostname !== base.hostname) return;
        // Strip hash and trailing slash for dedup
        const normalized = absolute.split('#')[0].replace(/\/$/, '');
        if (!seen.has(normalized)) {
          seen.add(normalized);
          links.push(normalized);
        }
      } catch {
        // skip malformed URLs
      }
    });
  }

  return links;
}
```

### 4. `lib/scraping/filter.ts`

```typescript
import 'server-only';
import type { Source } from '@/lib/supabase/types';

const GENERIC_REJECT_PATTERNS = [
  /\/sections?\//i,
  /\/categor(y|ies)\//i,
  /\/tags?\//i,
  /\/topics?\//i,
  /\/author\//i,
  /\/search/i,
  /\/live\b/i,
  /\/newsletter/i,
  /\/podcasts?\//i,
  /\/shows?\//i,
  /\/video(s)?\/?$/i,
];

// Source-specific rules keyed by hostname keyword
const SOURCE_RULES: Record<string, (u: URL) => boolean> = {
  'reuters.com': (u) => {
    const segments = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (segments.length < 4) return false;
    if (/\/graphics\/|\/video\/|\/pictures\//.test(u.pathname)) return false;
    // Last segment should be a long slug (article titles)
    const lastSeg = segments[segments.length - 1];
    return lastSeg.length >= 10 && lastSeg.includes('-');
  },
  'bbc.com': (u) => {
    // Accept /news/articles/... or /news/slug-with-8+digits
    if (/\/sport\/|\/sounds\/|\/weather\/|\/programmes\//.test(u.pathname)) return false;
    if (/\/news\/articles\//.test(u.pathname)) return true;
    // /news/[topic-category-digits] — the trailing digits distinguish articles from sections
    const m = u.pathname.match(/^\/news\/([\w-]+-\d{7,})$/);
    return !!m;
  },
  'npr.org': (u) => {
    if (/\/sections?\/|\/music\/|\/podcasts?\/|\/series\/|\/about\/|\/stations\//.test(u.pathname)) return false;
    // NPR article: /yyyy/mm/dd/digits/slug
    return /\/\d{4}\/\d{2}\/\d{2}\/\d+\//.test(u.pathname);
  },
  'theguardian.com': (u) => {
    const segments = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (segments.length < 4) return false;
    if (/\/thefilter|\/newsletters?|\/membership|\/support/.test(u.pathname)) return false;
    // Guardian articles have year in path: /section/yyyy/mmm/dd/slug
    return /\/\d{4}\/[a-z]{3}\/\d{2}\//.test(u.pathname);
  },
  'foxnews.com': (u) => {
    if (/\/shows?\/|\/live\/?$|\/entertainment\/games|\/category\/|\/sports\//.test(u.pathname)) return false;
    const segments = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (segments.length < 2) return false;
    const slug = segments[segments.length - 1];
    // Must be a long slug with multiple hyphens
    return slug.length >= 20 && (slug.match(/-/g) || []).length >= 3;
  },
};

export function isArticleUrl(url: string, source: Source): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Must be http(s)
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;

  // No query-only or fragment-only URLs
  if (!parsed.pathname || parsed.pathname === '/') return false;

  // Generic rejection patterns
  if (GENERIC_REJECT_PATTERNS.some((re) => re.test(parsed.pathname))) return false;

  // Source-specific check
  for (const [key, check] of Object.entries(SOURCE_RULES)) {
    if (parsed.hostname.includes(key)) return check(parsed);
  }

  // Fallback: require at least 2 path segments
  const segments = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  return segments.length >= 2;
}
```

### 5. `lib/scraping/validator.ts`

```typescript
import 'server-only';
import { load } from 'cheerio';
import type { Source } from '@/lib/supabase/types';

export interface ParsedArticle {
  title: string;
  published_at: string;     // ISO string
  image_url: string;
  canonical_url: string;
  raw_text: string;
}

const NOISE_PATTERNS = [
  /load more/gi,
  /sign up for/gi,
  /subscribe (now|today|to)/gi,
  /newsletter/gi,
  /follow us on/gi,
  /share this article/gi,
  /read more:/gi,
  /related (stories|articles|content)/gi,
  /most (read|viewed|popular)/gi,
  /advertisement/gi,
];

function cleanText(text: string): string {
  return NOISE_PATTERNS.reduce((t, re) => t.replace(re, ''), text).replace(/\s{3,}/g, '\n\n').trim();
}

function extractJsonLdDate(html: string): string | null {
  const match = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

export function parseArticlePage(html: string, url: string, _source: Source): ParsedArticle | null {
  const $ = load(html);

  // ── Title ──────────────────────────────────────────────────────────────────
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('meta[name="article:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim();

  if (!title || title.length < 5) return null;

  // Reject generic/section titles
  const GENERIC_TITLES = /^(home|news|world|politics|sport|weather|sections?|latest|top stories)$/i;
  if (GENERIC_TITLES.test(title.trim())) return null;

  // ── Published date ─────────────────────────────────────────────────────────
  const rawDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[property="og:article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    $('meta[name="article.published"]').attr('content') ||
    extractJsonLdDate(html);

  if (!rawDate) return null;

  let published_at: string;
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    published_at = d.toISOString();
  } catch {
    return null;
  }

  // ── Image URL ──────────────────────────────────────────────────────────────
  const image_url =
    $('meta[property="og:image"]').attr('content')?.trim() ||
    $('meta[name="twitter:image"]').attr('content')?.trim() ||
    $('article img[src^="https://"]').first().attr('src')?.trim() ||
    $('main img[src^="https://"]').first().attr('src')?.trim() || '';

  if (!image_url) return null;

  // ── Canonical URL ──────────────────────────────────────────────────────────
  const canonical_url =
    $('link[rel="canonical"]').attr('href')?.trim() ||
    $('meta[property="og:url"]').attr('content')?.trim() ||
    url;

  // ── Body text ──────────────────────────────────────────────────────────────
  // Remove noise elements first
  $('script, style, nav, footer, header, aside, noscript, [class*="ad"], [class*="promo"], [class*="newsletter"], [class*="social"], [class*="related"], [class*="sidebar"], [id*="newsletter"], [id*="related"]').remove();

  let paragraphs: string[] = [];

  const articleEl = $('article').length ? $('article') : $('main');
  articleEl.find('p').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 30) paragraphs.push(text);
  });

  // If extraction yielded very few paragraphs, try splitting by sentence
  if (paragraphs.length < 2) {
    const rawBody = articleEl.text().replace(/\s+/g, ' ').trim();
    const sentences = rawBody.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.length > 40);
    if (sentences.length >= 5) {
      // Group sentences into pseudo-paragraphs of 3
      for (let i = 0; i < sentences.length; i += 3) {
        paragraphs.push(sentences.slice(i, i + 3).join(' '));
      }
    }
  }

  const raw_text = cleanText(paragraphs.join('\n\n'));
  const charCount = raw_text.replace(/\s/g, '').length;

  // Quality check: 3+ paragraphs or 900+ meaningful chars
  if (paragraphs.length < 3 && charCount < 900) return null;

  return { title, published_at, image_url, canonical_url, raw_text };
}
```

### 6. `lib/scraping/pipeline.ts`

Types:

```typescript
export interface ScrapePipelineOptions {
  sourceIds?: string[];   // if omitted, use all active sources
  limit?: number;         // max valid articles per source, default 5
}

export interface ScrapeSummary {
  status: 'completed' | 'failed';
  sources_checked: number;
  candidates_found: number;
  candidates_rejected: number;
  duplicates_skipped: number;
  detail_pages_scraped: number;
  articles_inserted: number;
  articles_rejected: number;
  articles_failed: number;
  duration_ms: number;
  rejection_reasons: Record<string, number>;
}
```

Flow (implement as `runScrapePipeline(options): Promise<ScrapeSummary>`):

1. Load active sources. If `sourceIds` provided, filter to those IDs.
2. For each source:
   a. Log `[scrape] Source: {name} — {listing_url}`.
   b. Scrape homepage HTML via `scrapeUrl`. Log success or catch/log error, continue to next source.
   c. Call `extractLinks(html, listing_url)`. Log candidate count.
   d. Filter with `isArticleUrl`. Log rejected count and reason buckets.
   e. Remove duplicate URLs within the batch (`Set`).
   f. Chunk URLs ≤ 15 and query `supabase.from('articles').select('original_url').in('original_url', chunk)` to find existing URLs. Log duplicates skipped.
   g. For each remaining URL (up to `limit` valid inserts):
      - Scrape detail page HTML via `scrapeUrl`.
      - Call `parseArticlePage(html, url, source)`.
      - If null → log rejection reason, continue.
      - If valid → insert article to `articles` table via `supabase.from('articles').insert(...)`.
      - Log inserted or failed.
3. After all sources, log summary object.
4. Return `ScrapeSummary`.

Insertion row shape:
```typescript
{
  source_id: source.id,
  original_url: url,
  canonical_url: parsed.canonical_url,
  title: parsed.title,
  image_url: parsed.image_url,
  published_at: parsed.published_at,
  raw_text: parsed.raw_text,
  scraped_at: new Date().toISOString(),
  analyzed_at: null,
}
```

Handle Supabase unique constraint violations (code `23505`) as duplicates, not errors.

### 7. `app/api/scrape/route.ts`

```typescript
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { runScrapePipeline } from '@/lib/scraping/pipeline';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-biasly-admin-secret');
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { sourceIds?: string[]; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine, use defaults
  }

  console.log('[POST /api/scrape] Starting scrape pipeline', body);

  const summary = await runScrapePipeline({
    sourceIds: body.sourceIds,
    limit: body.limit ?? 5,
  });

  return NextResponse.json(summary);
}
```

### 8. Update `next.config.ts`

Add to `images.remotePatterns`:

```typescript
{ protocol: 'https', hostname: '**.reuters.com' },
{ protocol: 'https', hostname: '**.bbc.com' },
{ protocol: 'https', hostname: '**.bbci.co.uk' },
{ protocol: 'https', hostname: '**.npr.org' },
{ protocol: 'https', hostname: '**.theguardian.com' },
{ protocol: 'https', hostname: '**.guim.co.uk' },
{ protocol: 'https', hostname: '**.foxnews.com' },
{ protocol: 'https', hostname: 'a57.foxnews.com' },
```

---

## Security requirements

- `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, and `BIASLY_ADMIN_SECRET` are only accessed in `server-only` modules or API route handlers.
- `POST /api/scrape` rejects with `401` if `x-biasly-admin-secret` header is missing or wrong.
- No credentials appear in the response body.
- No browser code calls scraping functions.
- Never pass more than 15 URLs to a single Supabase `.in()` filter (data integrity, avoids URL length limits).

---

## Acceptance criteria

- [ ] `npm install cheerio` succeeds
- [ ] `lib/scraping/oxylabs.ts` calls Oxylabs realtime API with Basic Auth, returns HTML
- [ ] `lib/scraping/extractor.ts` extracts article links from homepage HTML
- [ ] `lib/scraping/filter.ts` correctly accepts/rejects URLs for all 5 seeded sources
- [ ] `lib/scraping/validator.ts` extracts title, date, image, body; returns null for invalid pages
- [ ] `lib/scraping/pipeline.ts` orchestrates full flow with logging and Supabase inserts
- [ ] `app/api/scrape/route.ts` responds 401 without valid secret, runs pipeline with valid secret
- [ ] `next.config.ts` allows image hostnames for all 5 news sources
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run lint` passes

---

## Checks to run

```bash
npx tsc --noEmit
npm run lint
```

---

## Manual test steps

1. Start dev server: `npm run dev`

2. Verify 401 is returned without the secret:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/scrape
   # Expected: 401
   ```

3. Run a scrape of all active sources (5 per source, default):
   ```bash
   curl -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -H "x-biasly-admin-secret: hello" \
     -d '{}'
   ```
   Watch the Next.js terminal for:
   - `[scrape] Started` line
   - Per-source logs: homepage fetched, candidates found, rejected count, duplicates, detail pages, inserted/rejected
   - Final summary object
   
   The response JSON should match the summary object.

4. Run a targeted scrape for one source with a lower limit:
   ```bash
   # First get a source ID from Supabase or logs
   curl -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -H "x-biasly-admin-secret: hello" \
     -d '{"limit": 2}'
   ```

5. In Supabase Dashboard → Table Editor → `articles`: confirm new rows with non-null `title`, `image_url`, `published_at`, `raw_text`, and `analyzed_at` = null.

6. Open `http://localhost:3000` — home page shows "No articles yet." (expected until `POST /api/analyze` runs in the next section).

7. Run a second identical scrape — verify the response shows `duplicates_skipped` equal to the number inserted in step 3, and `articles_inserted: 0`.
