# 001c — Dark Mode Theme + `/design-system` Showcase

## Task goal

Add a derived dark token set that mirrors the existing light truth-news roles, wire
Light / Dark / Auto theme switching with persistence and no FOUC, and ship a
dedicated `/design-system` showcase page with a theme switcher.

## Skills read

- `node_modules/next/dist/docs/` — App Router layout, client components, metadata
- Tailwind v4 `@theme` + CSS variable theming (class-based `.dark`)
- Existing tokens in `docs/prompts/001-design-system-theme.md` and
  `docs/prompts/001b-design-system-primitives.md`

## Existing code inspected

- `app/globals.css` — light-only hardcoded `@theme` colors
- `app/layout.tsx` — Poppins, no theme provider
- `app/page.tsx` — primitive preview (kept; add link to showcase)
- Primitives: `Button`, `Chip`, `BiasMeter`, `ArticleCard`, `Logo`, `Container`

## Decisions / assumptions

- Palette derived (no dark design PNG): same roles as light; Left/Right bias identity
  preserved with slightly brighter dark hex; Center + neutrals retuned for dark UI.
- Modes: `light` | `dark` | `system` (UI label “Auto”).
- Persistence: `localStorage` key `truth-news-theme`.
- FOUC prevention via inline script before paint.
- Hand-rolled ThemeProvider (no `next-themes`).
- Showcase at `/design-system` only; switcher not mounted in root layout yet
  (Step 004 TopBar will reuse `ThemeSwitcher`).
- Discreet link on home preview to `/design-system`.

## Dark token table

| Token | Light | Dark |
| --- | --- | --- |
| Text Primary | `#0D0D0F` | `#F5F5F5` |
| Text Secondary | `#6B7280` | `#9CA3AF` |
| Surface | `#F6F6F6` | `#17171A` |
| Left Bias | `#B42318` | `#F04438` |
| Center | `#E5E7EB` | `#3F3F46` |
| Right Bias | `#1D4ED8` | `#3B82F6` |
| BG Primary | `#FFFFFF` | `#0D0D0F` |
| BG Secondary | `#F0F0F0` | `#1C1C1F` |
| Border / Divider | `#E5E7EB` | `#2A2A2E` |
| Background / Foreground | white / near-black | near-black / near-white |

Dark shadows (softer / lighter lifts):

- sm: `0px 1px 2px rgba(0,0,0,0.4)`
- md: `0px 4px 12px rgba(0,0,0,0.45)`
- lg: `0px 12px 24px rgba(0,0,0,0.5)`

## Files likely to change / create

Modified:

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`

Created:

- `docs/prompts/001c-dark-mode-theme-and-showcase.md` (this file)
- `lib/theme.ts`
- `components/theme/theme-provider.tsx`
- `components/theme/theme-script.tsx`
- `components/theme/theme-switcher.tsx`
- `app/design-system/page.tsx`
- `components/design-system/color-swatches.tsx` (optional helper)
- `components/design-system/showcase.tsx` (client shell with switcher if needed)

## Implementation requirements

1. Refactor colors/shadows to `:root` vars; override under `.dark`; map via `@theme`.
2. `ThemeProvider` + FOUC script + `ThemeSwitcher` (radiogroup Light/Dark/Auto).
3. Wrap layout children; `suppressHydrationWarning` on `<html>`.
4. Audit primitives for contrast; fix only if needed.
5. `/design-system` page: brand, switcher, swatches, type, buttons, chips, icons,
   bias meters, article card. Metadata title: `Design System · truth-news`.
6. Presentation only — no secrets / pipeline.

## Security requirements

- Client-only preference storage. No secrets. No scraping/analysis/DB.

## Acceptance criteria

- Toggling Light/Dark/Auto updates semantic colors and primitives.
- Hard refresh with Dark saved shows no white flash.
- Auto tracks OS `prefers-color-scheme`.
- `/design-system` showcases all sections.
- `npm run typecheck`, `lint`, `build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Manual QA on `/design-system`
- `graphify update .`

## Exact manual test steps

1. `npm run dev` → open `http://localhost:3000/design-system`
2. Cycle Light → Dark → Auto; confirm swatches and card/meter/buttons
3. Set Dark, hard refresh — page should start dark (no flash)
4. Set Auto, change OS theme (or DevTools prefers-color-scheme) — UI follows

## Out of scope

- TopBar theme UI (Step 004)
- Clerk appearance
- Moving full preview off `/`
