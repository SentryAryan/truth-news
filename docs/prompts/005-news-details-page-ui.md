# 005 — News Details Page UI

## Goal

Implement the `/news/[id]` article details page with pixel-accurate fidelity to the
attached screenshot. Mock data only — no Supabase reads. Layout: left main content
column + right sticky sidebar on desktop. Responsive single column on mobile.

---

## Skills read

- `.agents/skills/next-best-practices` (SKILL.md, rsc-boundaries.md, image.md,
  data-patterns.md, async-patterns.md) — Next.js 15 async params, RSC boundaries,
  `next/image` usage.

---

## Existing code inspected

- `app/page.tsx` — home grid using `MOCK_ARTICLES`
- `app/layout.tsx` — `TopBar + SiteHeader + {children} + SiteFooter` wrapping
- `lib/types.ts` — `BiasBreakdown`, `HomeArticle`
- `lib/mock-articles.ts` — 12 `HomeArticle` entries; `trump-iran-peace-proposal` is the
  primary design reference
- `components/article-card.tsx` — links to `/news/${article.id}` (route already wired)
- `components/bias-meter.tsx` — three-segment bar, reuse on details page
- `components/icons.tsx` — existing icon set; needs three new icons
- `components/layout/site-header.tsx`, `site-footer.tsx`, `top-bar.tsx` — already in
  root layout, no changes needed
- `next.config.ts` — `picsum.photos` already allowed in `remotePatterns`
- `app/globals.css` — full token set: colors, typography, spacing, radius, shadows

---

## Decisions and assumptions

- **Mock data only.** No Supabase at this step. Data-wiring is a later step.
- **Static params.** Use `generateStaticParams` to pre-render all mock article IDs.
- **Async params.** Next.js 15: `params` is a Promise — `await params` before reading `id`.
- **No `'use client'`** on the page itself. All components on this page are Server
  Components unless they need interactivity (none do at this step).
- **`notFound()`** when the article ID is not found in mock data.
- **Related Stories** uses other mock articles (exclude current). Show up to 6 in a 2×3
  responsive grid (2 cols on md+, 1 col on mobile).
- **Newsletter banner** lives between article content and the footer; it is a separate
  component rendered inside the page, above the root-layout `<SiteFooter />`.
- **Sidebar** is sticky on desktop (`lg:sticky lg:top-6`). On mobile all sidebar cards
  stack below the article body.
- **BiasMeter** reused as-is for the inline "Bias Distribution" bar.
- **Source bias chip colors** use existing tokens: `bias-left` (red), `bias-center`
  (gray/border), `bias-right` (blue).
- **Image caption**: small gray text below hero image inside the `<figure>`.
- **No new npm packages** added.

---

## New types (extend `lib/types.ts`)

```ts
export type SourceEntry = {
  name: string;
  bias: 'left' | 'center' | 'right';
};

export type RelatedStory = {
  id: string;
  category: string;
  location: string;
  title: string;
  imageUrl: string;
  publishedDate: string; // e.g. "May 29, 2026"
  readTime: string;      // e.g. "8 min read"
};

export type DetailArticle = {
  id: string;
  category: string;
  location: string;
  title: string;
  author: string;
  publishedDate: string;
  readTime: string;
  imageUrl: string;
  imageCaption: string;
  bias: BiasBreakdown;
  sources: number;
  body: string[];        // paragraphs
  // Sidebar — Bias Analysis
  overallBiasLabel: 'left' | 'center' | 'right' | 'mixed' | 'unclear';
  overallBiasPercent: number; // dominant percentage shown large
  // Sidebar — AI Summary
  summary: string[];     // bullet points
  summaryDate: string;
  summaryReadTime: string;
  // Sidebar — Source Breakdown
  sourceList: SourceEntry[];
  // Related Stories
  relatedIds: string[];  // ids from MOCK_ARTICLES to show as related
};
```

---

## New mock data (`lib/mock-articles.ts`)

Add `MOCK_DETAIL_ARTICLES: Record<string, DetailArticle>` with one full entry for
`trump-iran-peace-proposal` matching the screenshot content exactly. Add a helper
`getMockDetailArticle(id: string): DetailArticle | undefined`.

The `trump-iran-peace-proposal` entry must include:
- category: "Politics", location: "United States"
- author: "By David Morgan", publishedDate: "May 31, 2026", readTime: "12 min read"
- imageUrl: picsum seed "trump-iran" (already used on home)
- imageCaption: "President Donald Trump in the Cabinet Room at the White House,
  Washington, D.C., May 30, 2026. Photo: Andrew Harnik/Getty Images"
- bias: { left: 20, center: 31, right: 49 }, sources: 12
- overallBiasLabel: "right", overallBiasPercent: 49
- body: 8 realistic paragraphs matching the screenshot text
- summary: 5 bullet points matching the screenshot AI Summary panel
- summaryDate: "May 31, 2026", summaryReadTime: "3 min read"
- sourceList: 8 entries matching the screenshot Source Breakdown panel
  (Fox News → right, WSJ → center, Reuters → center, BBC → center,
   CNN → left, NYT → center, WaPo → center, Newsmax → right)
- relatedIds: 5 other article ids from MOCK_ARTICLES (world / politics themed)

---

## Files to create

| File | Purpose |
|------|---------|
| `app/news/[id]/page.tsx` | Route page — async params, `notFound()`, two-column layout |
| `components/details/bias-analysis-card.tsx` | Right sidebar "Bias Analysis" card |
| `components/details/ai-summary-card.tsx` | Right sidebar "AI Summary" card |
| `components/details/source-breakdown-card.tsx` | Right sidebar "Source Breakdown" card |
| `components/details/related-story-card.tsx` | Compact horizontal story card |
| `components/newsletter-banner.tsx` | "Stay Informed. Stay Balanced." CTA section |

## Files to modify

| File | Change |
|------|--------|
| `lib/types.ts` | Add `SourceEntry`, `RelatedStory`, `DetailArticle` |
| `lib/mock-articles.ts` | Add `MOCK_DETAIL_ARTICLES`, `getMockDetailArticle` |
| `components/icons.tsx` | Add `BookmarkIcon`, `ShareIcon`, `MoreHorizontalIcon` |

---

## Implementation requirements

### `app/news/[id]/page.tsx`

```tsx
// Server Component
export async function generateStaticParams() { ... } // all mock ids
export async function generateMetadata({ params }) { ... } // dynamic title

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = getMockDetailArticle(id);
  if (!article) notFound();
  // render layout
}
```

**Layout structure (desktop: side-by-side, mobile: stacked):**

```
<main>
  <section class="mx-auto max-w-(--container-truth-news) px-4 sm:px-6 py-8">
    <div class="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 xl:gap-12">
      <!-- LEFT: article content -->
      <article>
        breadcrumb · title · author meta · action buttons
        hero image (figure)
        bias distribution bar
        body paragraphs
        related stories section
      </article>

      <!-- RIGHT: sidebar (sticky) -->
      <aside class="mt-8 space-y-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
        <BiasAnalysisCard ... />
        <AiSummaryCard ... />
        <SourceBreakdownCard ... />
      </aside>
    </div>
  </section>

  <NewsletterBanner />
</main>
```

### Breadcrumb
```
<p class="text-body-sm">
  <span class="font-medium text-text-primary">{category}</span>
  <span class="text-text-secondary"> · {location}</span>
</p>
```

### Title
`<h1 class="text-h1 font-bold text-text-primary leading-tight mt-2 mb-4">`

### Author meta + actions row
```
<div class="flex items-center justify-between gap-4 border-b border-border pb-4 mb-6">
  <p class="text-body-sm text-text-secondary">
    {author} | {publishedDate} | {readTime}
  </p>
  <div class="flex items-center gap-3 text-text-secondary">
    <button aria-label="Save"><BookmarkIcon /></button>
    <button aria-label="Share"><ShareIcon /></button>
    <button aria-label="More"><MoreHorizontalIcon /></button>
  </div>
</div>
```

### Hero image
```
<figure class="mb-6">
  <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-surface">
    <Image fill sizes="..." priority />
  </div>
  <figcaption class="mt-2 text-caption text-text-secondary">{imageCaption}</figcaption>
</figure>
```
Use `priority` on hero image (LCP).

### Bias Distribution (below hero)
```
<div class="mb-8 rounded-lg border border-border p-4">
  <p class="mb-3 flex items-center gap-1.5 text-body-sm font-medium text-text-primary">
    Bias Distribution <InfoIcon />
  </p>
  <BiasMeter left={...} center={...} right={...} />
  <p class="mt-2 text-caption text-text-secondary">{sources} sources</p>
</div>
```

### Body paragraphs
```tsx
{article.body.map((para, i) => (
  <p key={i} class="mb-5 text-body-lg text-text-primary leading-relaxed">{para}</p>
))}
```

### Related Stories section
```
<section class="mt-10 border-t border-border pt-8">
  <h2 class="mb-5 text-h3 font-semibold text-text-primary">Related Stories</h2>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {related.map(story => <RelatedStoryCard key={story.id} story={story} />)}
  </div>
</section>
```

### `components/details/related-story-card.tsx`
Horizontal card: small square thumbnail left (~80px), text right.
```
category · location (caption)
title (body-sm, semibold, 2-line clamp)
date · read time (caption, text-secondary)
```
Wraps in `<Link href="/news/{id}">`.

### `components/details/bias-analysis-card.tsx`
```
<div class="rounded-lg border border-border p-5 space-y-4">
  header: "Bias Analysis" + InfoIcon (right)
  "Overall Bias" label (body-sm, text-secondary)
  "{overallBiasLabel capitalized} {overallBiasPercent}%" — text-h2 font-bold colored by label
    left → text-bias-left, right → text-bias-right, center → text-text-primary
  "Based on {sources} balanced sources" (caption, text-secondary)

  divider

  Left bar row: label + percentage + colored bar
  Center bar row
  Right bar row

  "How We Analyze Bias" button (full-width, outlined)
</div>
```

Bias bar row pattern (per Left/Center/Right):
```
<div class="flex items-center gap-3">
  <span class="w-12 text-body-sm text-text-secondary">{Label}</span>
  <div class="flex-1 h-2 rounded-full bg-surface overflow-hidden">
    <div class="h-full rounded-full bg-bias-{direction}" style={{ width: `${pct}%` }} />
  </div>
  <span class="w-8 text-right text-body-sm font-medium text-text-primary">{pct}%</span>
</div>
```

### `components/details/ai-summary-card.tsx`
```
<div class="rounded-lg border border-border p-5 space-y-4">
  header: "AI Summary" + InfoIcon
  "{summaryDate} · {summaryReadTime}" (caption, text-secondary)

  <ul class="space-y-3 list-disc pl-4 text-body-sm text-text-primary">
    {summary.map(point => <li>{point}</li>)}
  </ul>

  <p class="text-caption text-text-secondary">AI summaries can make mistakes.</p>
  "Provide Feedback" button (full-width, outlined)
</div>
```

### `components/details/source-breakdown-card.tsx`
```
<div class="rounded-lg border border-border p-5 space-y-4">
  header: "Source Breakdown" + InfoIcon
  "{sources} Total Sources" (body-sm, text-secondary)

  Left / Center / Right count bars (same pattern as BiasAnalysisCard bar rows,
  but show count text like "2 (20%)" instead of just percentage)

  divider

  "Top Sources" label (body-sm, font-medium)
  list of {name + bias chip} rows:
    chip: text-caption px-2 py-0.5 rounded-full
      left → bg-bias-left/10 text-bias-left
      right → bg-bias-right/10 text-bias-right
      center → bg-surface text-text-secondary border border-border

  "View All Sources" button (full-width, outlined)
</div>
```

### `components/newsletter-banner.tsx`
```
<section class="bg-text-primary text-white py-12 px-4">
  <div class="mx-auto max-w-(--container-truth-news) flex flex-col sm:flex-row items-center
              justify-between gap-6 sm:gap-10">
    <div>
      <h2 class="text-h3 font-bold">Stay Informed. Stay Balanced.</h2>
      <p class="mt-1 text-body-sm text-white/70">
        Get the top stories and bias analysis delivered to your inbox.
      </p>
    </div>
    <form class="flex w-full max-w-sm items-center gap-2">
      <input type="email" placeholder="Enter your email"
             class="flex-1 rounded-md bg-white/10 border border-white/20
                    px-4 py-2.5 text-body-sm text-white placeholder:text-white/50
                    focus:outline-none focus:ring-2 focus:ring-white/30" />
      <button type="submit"
              class="shrink-0 rounded-md bg-white px-5 py-2.5
                     text-body-sm font-semibold text-text-primary
                     hover:bg-white/90 transition-colors">
        Subscribe
      </button>
    </form>
  </div>
</section>
```

### New icons in `components/icons.tsx`
Add three line-style icons (same strokeBase pattern):
- `BookmarkIcon` — bookmark shape
- `ShareIcon` — share/upload arrow
- `MoreHorizontalIcon` — three horizontal dots

---

## Visual specification (from screenshot)

### Colors
- Overall bias label "Right 49%" → `text-bias-right` (#1d4ed8), font-bold, ~24px
- Left bias bar → `bg-bias-left` (#b42318, red)
- Center bias bar → `bg-bias-center` (#e5e7eb, gray)
- Right bias bar → `bg-bias-right` (#1d4ed8, blue)
- Source chip "Left" → red-tinted; "Right" → blue-tinted; "Center" → neutral border
- Newsletter bg → `bg-text-primary` (#0d0d0f, same as site footer)

### Typography
- H1 title: `text-h1 font-bold` (32px)
- Section headings ("Related Stories", card titles): `text-h3 font-semibold` (20px)
- Body paragraphs: `text-body-lg` (16px, line-height 1.6)
- Author/meta text: `text-body-sm text-text-secondary`
- Card supporting text: `text-body-sm`
- Caption / source list: `text-caption` (11px)

### Spacing
- Page horizontal padding: `px-4 sm:px-6`
- Page vertical padding: `py-8`
- Gap between main and sidebar: `gap-8 xl:gap-12`
- Card internal padding: `p-5`
- Paragraph spacing: `mb-5`

### Sidebar
- Width: `320px` fixed column on `lg+`
- Sticky: `lg:sticky lg:top-6 lg:self-start`
- Cards separated by `space-y-6`
- Mobile: renders below article body, full width

### Responsiveness
- `< lg` (< 1024px): single column — article then sidebar stacked
- `lg+` (≥ 1024px): two-column grid `[1fr_320px]`
- Related stories: `grid-cols-1 sm:grid-cols-2`

---

## Security requirements

- This page is UI/mock-only — no server secrets, no API calls, no user mutations.
- No `'use client'` on the page itself.
- Form in `NewsletterBanner` has no `action` — it is a static visual placeholder.

---

## Acceptance criteria

- [ ] `http://localhost:3000/news/trump-iran-peace-proposal` renders the full details page
- [ ] Left column: breadcrumb, H1 title, author meta, action icons, hero image with
      caption, bias distribution bar, 8 body paragraphs, related stories grid
- [ ] Right sidebar: Bias Analysis, AI Summary, Source Breakdown cards — visible on
      `lg+` and stacked on mobile
- [ ] Sidebar is sticky on desktop and does not scroll away
- [ ] BiasMeter bar matches the home card pattern (reused component)
- [ ] Source bias chips are correctly colored (red/gray/blue)
- [ ] Related stories render compact horizontal cards linking to `/news/{id}`
- [ ] Newsletter banner appears above the site footer
- [ ] `http://localhost:3000/news/unknown-id` returns 404 (`notFound()`)
- [ ] Home card links (`/news/{id}`) work for all 12 mock articles; only
      `trump-iran-peace-proposal` has full detail data, others call `notFound()`
- [ ] No TypeScript errors (`next build` or `tsc --noEmit` passes)
- [ ] No hydration errors in browser console
- [ ] `next/image` used for all images; `priority` on hero image

---

## Checks to run

```bash
npx tsc --noEmit
```

---

## Manual test steps

1. Run `npm run dev` (Next.js dev server).
2. Open `http://localhost:3000`.
3. Click any article card — verify you reach `/news/trump-iran-peace-proposal` (the only
   mock article with full detail data; others will 404).
4. Verify the left column shows breadcrumb → title → author/date/actions → hero image
   with caption → bias distribution bar → body paragraphs → "Related Stories".
5. Resize to desktop (≥ 1024px): confirm sidebar appears to the right, sticky.
6. Resize to mobile (< 1024px): confirm single-column layout, sidebar stacks below.
7. Verify sidebar cards: Bias Analysis (Right 49%), AI Summary (5 bullets), Source
   Breakdown (8 sources listed).
8. Click a related story card — verify it links to `/news/{id}`.
9. Scroll to bottom — verify newsletter banner appears above the site footer.
10. Open `http://localhost:3000/news/not-a-real-id` — verify Next.js 404 page.
