# 013 — Homepage skeleton loaders

## Goal

Add industry-standard skeleton loaders on the home page for navigation / filter / pagination transitions so users see an immediate, layout-stable loading state instead of a blank or stuck previous page while the server re-fetches.

## Skills read

- `node_modules/next/dist/docs/` — App Router `loading.tsx`, Suspense boundaries, soft navigation
- Design system: `docs/prompts/001b-design-system-primitives.md`, `001-design-system-theme.md`, `001c-dark-mode-theme-and-showcase.md`
- Existing auth skeleton pattern: `components/auth/header-auth-slot.tsx` (`animate-pulse` + semantic tokens)

## Existing code inspected

- `app/(site)/page.tsx` — async RSC; awaits `getActiveSourcesForFilter` + `getHomeArticlesPage`; renders CategoryBar, toolbar, article grid, bottom pagination
- `app/(site)/layout.tsx` — chrome only (TopBar / SiteHeader / children / SiteFooter); no loading UI
- `components/article-card.tsx` — feed variant: image aspect `[16/10]`, chips, bias meter, title block
- `components/category-bar.tsx`, `components/home/home-feed-toolbar.tsx`, `home-feed-filters.tsx`, `home-pagination.tsx`
- No existing `loading.tsx` or Skeleton primitive in the repo

## Decisions / assumptions

1. **Route-level `loading.tsx`** under `app/(site)/` is the primary industry pattern for Next.js App Router soft navigations (filter / page / pageSize / source chip links). Layout chrome stays visible; only `children` swap to the skeleton.
2. **Do not skeleton TopBar / SiteHeader / SiteFooter** — they already paint from the layout; flashing chrome is worse UX.
3. **Skeleton mirrors real layout**: CategoryBar chip row → Top News title + filter controls → 6–9 card placeholders in the same 1/2/3-column grid → optional pagination bar stub.
4. **Article card skeleton** matches feed card geometry (image block + text lines + chip stubs + bias bar stub) so CLS stays low.
5. **Reusable primitive** `components/ui/skeleton.tsx` (hand-rolled Tailwind, semantic tokens: `bg-surface` / `bg-bg-secondary`, `animate-pulse`, `rounded-*`) — same approach as `AuthAvatarSkeleton`, not a new design language.
6. **Image loading**: keep `next/image` as-is; optional subtle pulse on image container is unnecessary if route skeletons cover navigations. Do not add client-side fetch skeletons for the grid (data is server-rendered).
7. **Accessibility**: skeleton region uses `aria-busy="true"` and `aria-label="Loading articles"` (or visually hidden “Loading…”); decorative bars `aria-hidden`.
8. **Tests**: unit-smoke test that Skeleton renders with expected classes; optional snapshot not required. Prefer a small pure component test if the project has Vitest/Jest patterns for UI.

## Files likely to change / create

Created:

- `components/ui/skeleton.tsx` — base `Skeleton` primitive
- `components/home/home-feed-skeleton.tsx` — composed homepage loading UI (category chips + toolbar + card grid)
- `app/(site)/loading.tsx` — exports `HomeFeedSkeleton` (or wraps it)
- Tests under existing test layout (e.g. `components/ui/skeleton.test.tsx` or `components/home/home-feed-skeleton.test.tsx`) if the repo already tests components

Modified:

- None required on `page.tsx` if `loading.tsx` covers navigations (preferred). Only touch `page.tsx` if a nested Suspense split is needed (not expected).

## Implementation requirements

1. Add `Skeleton` primitive:
   - `className` merge via `cn`
   - Default: `animate-pulse rounded-md bg-surface` (dark-mode safe via tokens)
2. Add `ArticleCardSkeleton` (feed variant geometry) inside `home-feed-skeleton.tsx` or colocated.
3. Add `HomeFeedSkeleton`:
   - Category bar: horizontal row of 5–8 chip-sized pulses
   - Toolbar: title line + 3–4 select-sized pulses top-right
   - Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, default **6** card skeletons (matches common first paint density without overdrawing)
   - Bottom: thin pagination stub (optional, keep subtle)
4. Wire `app/(site)/loading.tsx` to render `HomeFeedSkeleton` inside the same surface wrapper (`flex-1 bg-surface` + Container spacing) as the real page.
5. Do **not** skeletonize `/news/[id]` in this task.
6. Reuse design tokens only — no new colors, no shadcn Skeleton package unless already present (prefer hand-roll to match auth skeleton).

## Security requirements

- No secrets, no client data fetching, no pipeline calls from skeleton UI.

## Acceptance criteria

- [ ] Navigating home filters / pagination / category chips shows skeleton immediately while the RSC payload loads
- [ ] Layout chrome (header/footer) remains stable
- [ ] Skeleton grid matches card aspect ratios closely enough to avoid major layout shift
- [ ] Light and dark mode both readable (pulse uses semantic surface tokens)
- [ ] `aria-busy` / accessible loading label present
- [ ] Typecheck and lint pass

## Checks to run

- `npm run typecheck`
- `npm run lint`
- Existing unit test command if skeleton tests are added

## Exact manual test steps

1. `npm run dev`, open `/`.
2. Change Bias / Sentiment / Source / Per page — confirm skeleton appears briefly, then real cards.
3. Click a CategoryBar source chip — same.
4. Click pagination (when `totalPages > 1`) — same.
5. Toggle theme light/dark during a slow navigation (throttle Network in DevTools) — skeleton remains visible and token-correct.
6. Confirm header Login / theme switcher never unmount during home soft navigations.
