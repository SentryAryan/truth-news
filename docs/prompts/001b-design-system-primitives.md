# 001b — Design System Tokens + Primitives

## Task goal

Implement the truth-news design system from `docs/prompt-imgs/01-ui-design-system.png`:

1. Theme tokens + Poppins (extends `001-design-system-theme.md`)
2. Hand-rolled reusable UI primitives (Button, Chip, BiasMeter, Icons, Logo, Container, ArticleCard)
3. Minimal `app/page.tsx` preview for visual QA until Step 004

No home chrome (TopBar / SiteHeader / SiteFooter / category bar / 12-card grid). No shadcn. No dark theme. No Clerk. No data layer.

## Skills read

- `node_modules/next/dist/docs/` — Next.js App Router, `next/font`, `next/image`
- Official Tailwind v4 `@theme` conventions (no project `tailwind` / `shadcn` skill folders)
- Existing token table in `docs/prompts/001-design-system-theme.md`

## Existing code inspected

- `app/layout.tsx` — Geist starter fonts, create-next-app metadata
- `app/globals.css` — minimal tokens + dark-mode media query
- `app/page.tsx` — create-next-app marketing page
- `package.json` — Tailwind v4, no shadcn, no icon library, no `typecheck` script yet

## Decisions / assumptions

- Hand-roll primitives with Tailwind only (recorded in 001 / 004).
- Surface hex: `#F6F6F6` (001 source of truth; matches sheet Primary Surface swatch).
- Single light theme; remove `prefers-color-scheme: dark`.
- All primitives are RSC by default (`hover:` / `disabled:` via CSS).
- Optional `href` on `ArticleCard` for Step 004 readiness; not required for preview.
- Tiny `cn` helper in `lib/cn.ts` (no `clsx` / `tailwind-merge` dependency).
- Preview page uses hardcoded mock props (local placeholder image or solid color fallback).
- Add `"typecheck": "tsc --noEmit"` to `package.json`.

## Files likely to change / create

Modified:

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `package.json`

Created:

- `lib/cn.ts`
- `lib/types/article-display.ts`
- `components/icons.tsx`
- `components/logo.tsx`
- `components/container.tsx`
- `components/ui/button.tsx`
- `components/ui/chip.tsx`
- `components/bias-meter.tsx`
- `components/article-card.tsx`

## Token spec (exact)

### Colors

| Token | Hex | Tailwind var |
| --- | --- | --- |
| Text Primary | `#0D0D0F` | `--color-text-primary` |
| Text Secondary | `#6B7280` | `--color-text-secondary` |
| Surface | `#F6F6F6` | `--color-surface` |
| Left Bias | `#B42318` | `--color-bias-left` |
| Center | `#E5E7EB` | `--color-bias-center` |
| Right Bias | `#1D4ED8` | `--color-bias-right` |
| BG Primary | `#FFFFFF` | `--color-bg-primary` |
| BG Secondary | `#F0F0F0` | `--color-bg-secondary` |
| Border | `#E5E7EB` | `--color-border` |
| Divider | `#E5E7EB` | `--color-divider` |

Base: `--background: #FFFFFF`, `--foreground: #0D0D0F`.

### Typography — Poppins 400/500/600/700

| Style | Size | Weight | LH | Token |
| --- | --- | --- | --- | --- |
| H1 | 32px | 700 | 1.2 | `--text-h1` |
| H2 | 24px | 600 | 1.3 | `--text-h2` |
| H3 | 20px | 600 | 1.3 | `--text-h3` |
| H4 | 16px | 500 | 1.4 | `--text-h4` |
| Body Large | 16px | 400 | 1.6 | `--text-body-lg` |
| Body Medium | 14px | 400 | 1.6 | `--text-body-md` |
| Body Small | 13px | 400 | 1.6 | `--text-body-sm` |
| Caption | 11px | 400 | 1.4 | `--text-caption` |

Paired `--text-*--line-height` for each.

### Spacing / radius / shadows / grid

- `--spacing: 4px` (scale 4, 8, 16, 24, 32, 40, 64)
- Radius: sm 4, md 8, lg 12, full 9999
- Shadows: sm / md / lg per 001
- Container: `--container-truth-news: 1280px`; gutters/margins 24px (`px-6`)

## Primitive APIs

### Icons (`components/icons.tsx`)

Named exports: Menu, Search, Bookmark, Clock, Info, Upload, ExternalLink, Calendar, Chart, Tag, User, Bell, Settings, Check, More, Plus.

Shared props: `className?`, `size?` (default 20). Style: `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `currentColor`, `fill="none"`.

### Logo

- “truth-news” bold wordmark
- Optional `tagline?: string` (default none; sheet tagline available as prop)

### Container

- `max-w-(--container-truth-news)` or `max-w-[1280px]`, `mx-auto`, `px-6`

### Button

- Variants: `primary` | `secondary` | `text`
- States: default, hover, disabled (and secondary outline look)
- `rounded-md` (8px), ~40px height, body-md / medium weight
- Text variant hover → `text-bias-right` (`#1D4ED8`)

### Chip

- Pill `rounded-full`, surface/bg-secondary + border, body-sm
- Optional `showPlus` trailing Plus icon

### BiasMeter

- Props: `BiasPercentages` `{ left, center, right }`
- Normalize so segments sum to 100 (clamp / redistribute if needed)
- Labels: `L nn%`, `Center nn%`, `Right nn%` (caption, medium)
- Colors: bias-left / bias-center / bias-right

### ArticleCard (sheet card example)

- Horizontal: image left (rounded-md), content right
- Meta caption: `Category · Location`
- Title: H3
- Optional snippet: body-md
- Embedded BiasMeter
- Footer: time ago (clock), optional read time, bookmark icon
- Optional `href` for future linking
- `next/image` with explicit dimensions

## Implementation requirements

1. Tokens + Poppins per 001 in `globals.css` / `layout.tsx`; metadata → truth-news.
2. Types in `lib/types/article-display.ts`.
3. Primitives as listed; no new UI dependencies.
4. Replace starter `page.tsx` with thin preview: Container + Logo + Button row + Chip + one ArticleCard (mock props).
5. Presentation only — no pipeline / secrets / scraping.

## Security requirements

- Pure presentation. No Oxylabs, OpenAI, Supabase, admin secrets, or pipeline calls.
- No secrets in client code.

## Acceptance criteria

- Every color / type / radius / shadow token from the sheet exists with exact values.
- Poppins is default sans; no Geist/mono; no dark-mode block.
- Button (3 variants + disabled), Chip, BiasMeter, Icons, Logo, Container, ArticleCard render correctly.
- Preview page builds and shows primitives for visual QA.
- `npm run typecheck`, `npm run lint`, `npm run build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Manual visual check against `docs/prompt-imgs/01-ui-design-system.png`
- `graphify update .` after code changes

## Exact manual test steps

1. `npm run dev`
2. Open `http://localhost:3000`
3. Confirm Poppins, logo, primary/secondary/text buttons (hover + disabled), chips with +, bias meter colors/labels, article card layout vs the design sheet
4. Resize viewport; container stays ≤1280px with 24px side padding

## Out of scope

- TopBar, SiteHeader, SiteFooter, category bar, home grid (Step 004)
- `/design-system` route
- shadcn, icon packages, dark theme, Clerk
