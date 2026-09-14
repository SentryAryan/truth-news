# 004 — Home Page UI (design-system aligned)

## Task goal

Implement a pixel-accurate truth-news home page from `docs/prompt-imgs/02-homepage.png`,
using design-system tokens/primitives from 001b (+ dark/theme from 001c). UI only with
mock article data (no scrape/analysis/Supabase).

## Skills read

- `node_modules/next/dist/docs/` — App Router, layouts, `next/image`, RSC boundaries
- `docs/prompts/001b-design-system-primitives.md`
- `docs/prompts/001c-dark-mode-theme-and-showcase.md`
- Existing components under `components/`

## Existing code inspected

- `app/layout.tsx` — ThemeProvider + Poppins
- Design primitives: Button, Chip, BiasMeter, Logo, Container, icons, ThemeSwitcher
- `components/article-card.tsx` — horizontal (`inline`) layout used by `/design-system`
- `next.config.ts` — picsum.photos already allowed

## Decisions / assumptions

- **Visual source:** homepage PNG for layout/composition; 001b/001c for tokens/primitives.
- **Theme:** Wire live `ThemeSwitcher` into TopBar with `appearance="onDark"`.
- **Auth:** Subscribe / Login visual-only (Clerk later).
- **Cards:** `ArticleCard` gains `variant: "feed" | "inline"`. Home uses `feed` (vertical,
  image top, info badge, BiasMeter, `N sources`). Design-system showcase keeps `inline`.
- **Chrome:** `app/(site)/layout.tsx` wraps TopBar + SiteHeader + SiteFooter. Home at
  `app/(site)/page.tsx`. `/design-system` stays outside the route group (no site chrome).
- **Data:** 12 mock articles; links to `/news/[id]` (404 until details step).
- **Category bar** is home-only, not in site layout.

## Files likely to change / create

Created:

- `.cursor/rules/truth-news-design-system.mdc`
- `lib/mock-articles.ts`
- `components/layout/top-bar.tsx`
- `components/layout/site-header.tsx`
- `components/layout/site-footer.tsx`
- `components/category-bar.tsx`
- `app/(site)/layout.tsx`
- `app/(site)/page.tsx`

Modified:

- `lib/types/article-display.ts` — `HomeArticle`, card `variant` / `sourceCount`
- `components/icons.tsx` — chevrons, globe, socials
- `components/article-card.tsx` — feed | inline
- `components/theme/theme-switcher.tsx` — `appearance="onDark"`
- `components/design-system/showcase.tsx` — `variant="inline"`
- Remove `app/page.tsx` (replaced by `(site)/page.tsx`)

## Implementation requirements

1. TopBar: dark strip, Browser Extension, ThemeSwitcher, date, Set Location, International Edition.
2. SiteHeader: menu + Logo, nav (Home active, For You red dot, Local, Blindspot), Subscribe + Login.
3. CategoryBar: scrollable chips with `showPlus`.
4. Top News grid: 1 / 2 / 3 cols, 12 feed cards.
5. Footer: brand, Company, Help, Connect, copyright.
6. Semantic tokens only; no pipeline/secrets.

## Security requirements

- Presentation + static mocks only. No Oxylabs, OpenAI, Supabase, admin secrets.

## Acceptance criteria

- `/` matches homepage mockup structure (chrome, chips, 12-card grid, meters).
- Theme Light/Dark/Auto works from TopBar.
- `/design-system` remains chrome-free and uses inline card.
- `npm run typecheck`, `lint`, `build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Manual: `/` and theme toggle; `/design-system` still works
- `graphify update .`

## Exact manual test steps

1. `npm run dev` → open `http://localhost:3000`
2. Confirm TopBar theme switcher, header, category chips, 12 cards, footer
3. Toggle Light / Dark / Auto; cards and chrome adapt
4. Open `/design-system` — no TopBar/Header/Footer; inline card still shows
5. Click a card — navigates to `/news/[id]` (expected 404 until Step 005)

## Out of scope

- Clerk, real data, news details page, changing dark palette
