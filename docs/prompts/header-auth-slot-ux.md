# Header auth slot UX (Clerk profile delay)

## Goal

Mask the Clerk client-hydration gap in the site header so logged-in users do not see an empty auth slot (then a popping profile icon) when navigating to news details. Keep the logged-out Login button behavior. Prefer a fixed-size skeleton while Clerk loads, optionally seeded from server `auth()`, and stabilize Clerk appearance updates.

## Skills read

- Project Clerk patterns (`components/auth/*`, `components/theme/clerk-theme-provider.tsx`)
- `AGENTS.md` §2 workflow, §5 architecture (UI displays only; no pipeline changes)
- Design system: semantic tokens only (`bg-surface`, `border-border`, etc.)

## Existing code inspected

- `components/layout/site-header.tsx` — desktop uses bare `<Show when="signed-out|signed-in">` + `ThemedUserButton`
- `components/layout/site-header-menu.tsx` — mobile menu duplicates the same `<Show>` pattern
- `components/auth/themed-user-button.tsx` — client `UserButton` with theme appearance
- `components/theme/clerk-theme-provider.tsx` — new `appearance` object every render (no `useMemo`)
- `app/(site)/layout.tsx` — server layout; `SiteHeader` has no server auth seed today
- `app/(site)/news/[id]/page.tsx` — `auth.protect()` then article fetch (explains article-first paint)

## Decisions or assumptions

1. **Primary fix:** one shared client `HeaderAuthSlot` using `useAuth()`:
   - `!isLoaded` → fixed-size circular avatar skeleton (match `UserButton` ~28–32px)
   - `isSignedIn` → `ThemedUserButton`
   - else → Login `Button` linking to `/sign-in`
2. **Server seed (optional but included):** `SiteHeader` (or a thin server wrapper) calls `await auth()` and passes `initialSignedIn: boolean` into the client slot so the first paint can prefer Login vs skeleton/avatar space when Clerk is not loaded yet. If `initialSignedIn` is true and `!isLoaded`, show skeleton; if false and `!isLoaded`, show Login (or skeleton of Login button width) to avoid flash of wrong chrome.
3. **Reuse:** replace both desktop header and mobile menu `<Show>` blocks with `HeaderAuthSlot` (mobile may pass `fullWidth` for Login).
4. **Memoize** `ClerkThemeProvider` appearance with `useMemo(..., [resolvedTheme])`.
5. **Out of scope for this pass:** main-area RSC loading indicator; article card prefetch (optional polish from Ask reply — skip unless trivial).
6. No secrets in client code; no changes to `auth.protect()` or pipeline routes.

## Files likely to change

Create:

- `components/auth/header-auth-slot.tsx` — client auth slot + skeleton
- `prompts/header-auth-slot-ux.md` (this file)

Modify:

- `components/layout/site-header.tsx` — use slot; optionally `await auth()` if header becomes async server component
- `components/layout/site-header-menu.tsx` — use same slot
- `components/theme/clerk-theme-provider.tsx` — memoize appearance
- Possibly `components/auth/themed-user-button.tsx` — memoize appearance if cheap

## Implementation requirements

1. Skeleton: `h-8 w-8 rounded-full bg-surface animate-pulse` (or design-token equivalent), `aria-hidden` or `aria-busy` / polite “Loading account”.
2. Reserve space so Subscribe / ThemeSwitcher do not shift when Clerk finishes loading.
3. Desktop: keep current layout (ThemeSwitcher + Subscribe + auth slot).
4. Mobile menu: Login full width when signed out; centered UserButton when signed in; skeleton while loading.
5. Server seed: if `auth()` is available in the server header path, pass `initialSignedIn` into the client slot; client still trusts live `useAuth()` once `isLoaded`.
6. Do not invent parallel icon libraries or non-semantic colors.

## Security requirements

- Do not expose `CLERK_SECRET_KEY` or any server-only env to the client.
- Only pass a boolean (and optionally non-sensitive display hints) from server `auth()` — never session tokens.
- Keep existing `auth.protect()` on news details unchanged.

## Acceptance criteria

- [ ] When logged in, navigating from home → news details shows a fixed-size avatar skeleton (or reserved space) until `UserButton` hydrates — no empty gap then pop.
- [ ] When logged out, Login button still appears; news details still redirect to sign-in via server protect.
- [ ] Desktop and mobile menu both use the shared auth slot.
- [ ] `ClerkThemeProvider` appearance is memoized by `resolvedTheme`.
- [ ] No layout shift of adjacent header controls beyond the intentional reserved slot size.
- [ ] `npm run typecheck` and `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. `npm run dev`
2. Sign in, open `/`, click a news card → header should show skeleton (or reserved avatar) immediately, then `UserButton` without a blank hole.
3. Hard refresh on `/news/[id]` while signed in → same reserved auth chrome during Clerk load.
4. Sign out, click a news card → still redirected to sign-in (server protect).
5. Toggle light/dark → UserButton / profile card still themed; no obvious Clerk flicker from appearance rebuilds.
6. Mobile viewport: open hamburger menu while signed in / out / mid-load and confirm Login vs skeleton vs profile.
