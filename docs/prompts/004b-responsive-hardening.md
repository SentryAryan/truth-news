# 004b — Responsive Hardening (whole website)

## Task goal

Ensure the entire biasly website renders cleanly and usably across all device sizes
(small phone ≈320px → tablet → desktop → ultrawide), with no horizontal overflow and no
crowded/clipped chrome. Refinement of Step 04; no new features, no redesign.

## Matching plan step

Refinement of **Step 04 — Home page UI** (responsive behavior is part of its acceptance
criteria). Currently the home page is the only page; this pass also future-proofs the
shared layout chrome used by later pages.

## Skills read

- `.agents/skills/next-best-practices` (already in context). Tailwind v4 responsive
  utilities used (`sm:`/`md:`/`lg:`).

## Scope of changes (targeted, reversible)

1. **Header — `components/layout/site-header.tsx`**
   - Prevent overflow on small phones. Tighten gaps on mobile (`gap-3 md:gap-6`),
     reduce horizontal padding on mobile if needed.
   - Hide the **Subscribe** button below `sm` (keep **Login** as the primary action);
     both show from `sm` up. Slightly smaller button padding on mobile (`px-3 sm:px-5`).
   - Keep hamburger + logo always visible; nav links stay hidden below `md` (unchanged).
   - Ensure the active "Home" underline offset still lines up with the 64px header.

2. **Top bar — `components/layout/top-bar.tsx`**
   - Progressive disclosure on small screens: hide the `Theme: …` group below `sm`
     (keep `International Edition`); keep date hidden below `md` (unchanged).
   - Ensure the row never overflows; allow truncation/shrink and keep `justify-between`.

3. **Home page — `app/page.tsx`**
   - Ease section vertical padding on mobile (`py-6 sm:py-8`); grid stays 1/2/3.

4. **Footer — `components/layout/site-footer.tsx`**
   - Confirm 1 → 2 → 4 column flow and comfortable gaps on mobile; minor spacing only.

5. **Global**
   - Verify no element forces horizontal scrolling at 320px (bias meter labels already
     `truncate`; category bar already `overflow-x-auto`). Add `overflow-x-hidden` safety
     only if a real overflow is found — do not mask layout bugs.

## Constraints

- Use only Tailwind responsive utilities + existing step-001 design tokens.
- No new dependencies, no `"use client"`, no behavior/feature changes (buttons remain
  static/visual-only).
- Keep desktop appearance identical to the approved Step 04 result; only small/medium
  breakpoints change.

## Security requirements

None — presentation only. No data, scraping, analysis, or secrets touched.

## Acceptance criteria

- No horizontal overflow at 320px, 375px, 768px, 1024px, 1280px, and ultrawide.
- Header fits on a 320px phone with no clipped/overlapping elements.
- Top bar degrades gracefully (no overflow) on small screens.
- Card grid: 1 col (mobile) / 2 (sm) / 3 (lg). Footer: 1 / 2 / 4.
- Desktop layout unchanged from approved Step 04.
- `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run lint`
- `npm run build`
- (Optional) launch dev server and spot-check breakpoints.

## Plan update instructions

Append a short note under Step 04 in `plan.md` recording the responsive-hardening pass,
files changed, and checks run.
