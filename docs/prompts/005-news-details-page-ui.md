# 005 — News Details Page UI

## Goal

Implement the `/news/[id]` article details page with fidelity to
`docs/prompt-imgs/03-news-details-page.png`. Mock data only — no Supabase reads.
Layout: left main content + right sticky sidebar on desktop; single column on mobile.
Brand: **truth-news**. Fully responsive per industry standards.

---

## Skills / sources

- Design system: `001b` / `001` / `001c` + `.cursor/rules/truth-news-design-system.mdc`
- Mockup: `docs/prompt-imgs/03-news-details-page.png`
- Next.js 16: async `params` Promise, `generateStaticParams`, `generateMetadata`, `notFound()`

---

## Existing code inspected

- `app/(site)/layout.tsx` — TopBar + SiteHeader + children + SiteFooter
- `app/(site)/page.tsx` — home grid; cards link to `/news/${id}`
- `lib/types/article-display.ts` — `BiasPercentages`, `HomeArticle`, `ArticleCardProps`
- `lib/mock-articles.ts` — 12 home articles (`"1"`…`"12"`)
- `components/bias-meter.tsx`, `Button`, `Container`, icons (`IconBookmark`, `IconMore`, `IconInfo`)
- Theme switcher already in SiteHeader (not TopBar)

---

## Decisions and assumptions

- **Mock data only.** No Supabase / Clerk this step.
- **Route under `(site)`:** `app/(site)/news/[id]/page.tsx` so chrome wraps the page.
- **IDs:** Keep `"1"`…`"12"`. Article `"1"` is the full mockup story (Trump/Iran).
  Articles `"2"`–`"12"` get complete detail stubs so home links never 404.
- **Async params:** `params: Promise<{ id: string }>`, then `await params`.
- **Server Components** by default; newsletter is a static form (no action).
- **Typography:** Poppins + semantic tokens (no new serif font).
- **Newsletter:** Light band (`bg-surface`) with dark text — matches mockup; avoids dark-mode chrome bugs.
- **Sticky sidebar:** `lg:sticky lg:top-6 lg:self-start`.
- **Reuse:** `BiasMeter` for inline Bias Distribution; `IconBookmark` / `IconMore` / `IconInfo`; add `IconShare`.
- **Types path:** `lib/types/article-display.ts` (not `lib/types.ts`).

---

## Types (`lib/types/article-display.ts`)

Add `SourceEntry`, `RelatedStory`, `DetailArticle` using existing `BiasPercentages`.

---

## Mock data (`lib/mock-articles.ts`)

- Sync home article `"1"` title/image to the mockup story.
- `MOCK_DETAIL_ARTICLES` / `getMockDetailArticle(id)` / related-story helpers.
- Full detail for `"1"`; stubs for `"2"`–`"12"` derived from each `HomeArticle`.

---

## Files to create

| File | Purpose |
|------|---------|
| `app/(site)/news/[id]/page.tsx` | Route — static params, metadata, two-column layout |
| `components/details/bias-bar-row.tsx` | Shared L/C/R progress row |
| `components/details/bias-analysis-card.tsx` | Sidebar Bias Analysis |
| `components/details/ai-summary-card.tsx` | Sidebar AI Summary |
| `components/details/source-breakdown-card.tsx` | Sidebar Source Breakdown |
| `components/details/related-story-card.tsx` | Compact related card |
| `components/newsletter-banner.tsx` | Stay Informed CTA |

## Files to modify

| File | Change |
|------|--------|
| `lib/types/article-display.ts` | Detail types |
| `lib/mock-articles.ts` | Detail mocks + helpers |
| `components/icons.tsx` | `IconShare` |
| `docs/prompts/005-news-details-page-ui.md` | This refresh |

---

## Layout

```
<main>
  <Container> // py-6 sm:py-8
    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:gap-8 xl:gap-12">
      <article> … hero, bias bar, body, related … </article>
      <aside class="mt-8 space-y-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
        BiasAnalysis / AiSummary / SourceBreakdown
      </aside>
    </div>
  </Container>
  <NewsletterBanner />
</main>
```

On `< lg`: article → sidebar stack → related stays in article column → newsletter.

---

## Responsive acceptance

- No horizontal overflow at ~320 / 375 / 768 / 1024 / 1280
- H1: `text-h2 sm:text-h1`; meta/actions wrap; icon targets ≥40px
- Related: `grid-cols-1 sm:grid-cols-2`
- Newsletter: stack on small screens; input `min-w-0`

---

## Security

- UI/mock only — no secrets, no APIs, no mutations.
- Newsletter form has no `action`.

---

## Acceptance criteria

- [ ] `/news/1` renders full mockup details page
- [ ] All `/news/1`…`/news/12` resolve; unknown id → `notFound()`
- [ ] Two-column sticky sidebar on `lg+`; stacked below article on mobile
- [ ] BiasMeter reused; source chips colored; related links work
- [ ] Light newsletter above footer
- [ ] `typecheck`, `lint`, `build` pass

---

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Manual test steps

1. `npm run dev` → open `/` → click first card → `/news/1`.
2. Verify breadcrumb, title, meta, hero, bias bar, body, related, sidebar cards.
3. Desktop sticky sidebar; mobile stack.
4. Open `/news/2` (stub) and `/news/not-real` (404).
5. Toggle light/dark; check newsletter contrast.
