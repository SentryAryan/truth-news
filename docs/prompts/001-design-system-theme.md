# 001 — Design System Theme (tokens + Poppins)

## Task goal

Establish the truth-news **design-system theme only** — design tokens (colors, typography
scale, spacing, border radius, shadows, grid) and the Poppins font — derived
pixel-accurately from the attached design-system reference sheet.

No UI components. No `/design-system` showcase page. Theme foundation only.

## Matching plan step

Part of **Step 01 — Project setup** (base app layout + Tailwind foundation). This is a
focused subset: the design-token foundation that later UI steps (Step 04 home, Step 05
details) will consume. `plan.md` Step 01 status stays `pending` until full project setup
is confirmed; this prompt only advances the theme portion.

## Skills read

- `.agents/skills/next-best-practices` (SKILL.md, font.md) — Next.js v16 / Tailwind v4 /
  `next/font` conventions.
- **Missing skills:** `.agents/skills/tailwind` and `.agents/skills/shadcn` referenced by
  `plan.md` do not exist. Recorded as a known gap; used official Tailwind v4 `@theme`
  conventions instead.

## Decisions made

- **Scope (user):** Theme/tokens only — tokens + Poppins in the CSS file. No components,
  no page.
- **Components (user):** When components are built later, hand-roll with Tailwind (not
  shadcn). Recorded for future steps; out of scope here.
- **Assumption:** Tailwind v4 is already configured (CSS-first via `@import "tailwindcss"`
  and `@theme inline`). Tokens are added through `@theme inline` in `app/globals.css`.
- **Assumption:** The default Geist/Geist_Mono fonts are replaced by Poppins as the app's
  sans font. Geist_Mono removed (design system specifies no mono font).
- **Assumption:** Remove the `prefers-color-scheme: dark` block from the starter
  `globals.css` — the design system defines a single light theme only.
- **Assumption:** Token naming follows Tailwind v4 conventions so utilities are generated
  (e.g. `--color-*`, `--radius-*`, `--shadow-*`, `--spacing` base, `--text-*`). Custom
  semantic names map directly to the sheet labels.

## Files likely to change

- `app/globals.css` — replace starter tokens with the full truth-news token set.
- `app/layout.tsx` — swap Geist fonts for Poppins via `next/font/google`; wire
  `--font-sans`; update `metadata` title/description to truth-news.

No new files. No new dependencies.

## Token spec (source of truth = attached image)

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

Also set base `--background: #FFFFFF` / `--foreground: #0D0D0F` so `body` reads correctly.

### Typography — Poppins

| Style | Size | Weight | Line height | Tailwind var |
| --- | --- | --- | --- | --- |
| H1 | 32px | 700 Bold | 1.2 | `--text-h1` |
| H2 | 24px | 600 SemiBold | 1.3 | `--text-h2` |
| H3 | 20px | 600 SemiBold | 1.3 | `--text-h3` |
| H4 | 16px | 500 Medium | 1.4 | `--text-h4` |
| Body Large | 16px | 400 Regular | 1.6 | `--text-body-lg` |
| Body Medium | 14px | 400 Regular | 1.6 | `--text-body-md` |
| Body Small | 13px | 400 Regular | 1.6 | `--text-body-sm` |
| Caption | 11px | 400 Regular | 1.4 | `--text-caption` |

Use Tailwind v4 `--text-*` tokens with paired `--text-*--line-height` so
`text-h1` etc. emit size + line-height. Load Poppins weights 400/500/600/700.

### Spacing — 4px base

Scale values present on the sheet: `4, 8, 16, 24, 32, 40, 64` (px).
Set `--spacing: 4px` (Tailwind v4 base unit → `p-1`=4px, `p-2`=8px, `p-4`=16px,
`p-6`=24px, `p-8`=32px, `p-10`=40px, `p-16`=64px). No extra custom spacing tokens needed
since the listed values all fall on the 4px scale.

### Grid

- Container max width: `1280px` → `--container-truth-news: 1280px` (or document as a layout
  constant comment).
- 12 columns, gutter `24px`, outer margin `24px`. Captured as CSS comments / a container
  token; no utility generation required for tokens-only scope.

### Border radius

| Token | Value | Tailwind var |
| --- | --- | --- |
| Small | 4px | `--radius-sm` |
| Medium | 8px | `--radius-md` |
| Large | 12px | `--radius-lg` |
| Full | 9999px | `--radius-full` |

### Shadows

| Token | Value | Tailwind var |
| --- | --- | --- |
| Small | `0px 1px 2px rgba(0,0,0,0.05)` | `--shadow-sm` |
| Medium | `0px 4px 12px rgba(0,0,0,0.08)` | `--shadow-md` |
| Large | `0px 12px 24px rgba(0,0,0,0.12)` | `--shadow-lg` |

## Implementation requirements

1. In `app/layout.tsx`, import `Poppins` from `next/font/google` with subset `latin`,
   weights `["400","500","600","700"]`, assigned to CSS variable `--font-poppins`. Remove
   Geist and Geist_Mono. Apply the variable on `<html>`. Update `metadata` to
   `{ title: "truth-news", description: "Balanced news coverage, powered by AI." }`.
2. In `app/globals.css`, keep `@import "tailwindcss";`. Replace the `@theme inline` block
   with the full token set above, mapping `--font-sans: var(--font-poppins)`. Remove the
   dark-mode media query. Keep `body` using `--background`/`--foreground` and `font-sans`.
3. Use exact hex/px/line-height values from the image — no approximation.
4. Keep tokens readable and grouped by section with comments matching the sheet
   (Colors / Typography / Spacing / Radius / Shadows / Grid).

## Security requirements

None applicable — purely client-side styling tokens. No secrets, no server/client
boundary, no data access introduced.

## Acceptance criteria

- `app/globals.css` defines every color, typography, radius, and shadow token from the
  image with exact values.
- Poppins loads via `next/font` and is the default sans font; no Geist/mono remains.
- Dark-mode block removed; single light theme.
- `npm run build` succeeds and `npm run lint` passes.
- No components or pages added; diff limited to `app/globals.css` and `app/layout.tsx`.

## Checks to run

- `npm run lint`
- `npm run build`

(Both exist in `package.json`. No `typecheck` script — `build` covers type errors.)

## Plan update instructions

After implementation, update `plan.md`:
- Add a note under Step 01 that the design-system **theme** (tokens + Poppins) is done,
  with files changed and checks run.
- Record the missing `tailwind` / `shadcn` skill folders under Step 01 notes.
- Note the recorded decision: future UI primitives are hand-rolled with Tailwind.
- Leave Step 01 overall status `pending` until full project setup (folders, etc.) is
  confirmed; set next recommended action accordingly.
