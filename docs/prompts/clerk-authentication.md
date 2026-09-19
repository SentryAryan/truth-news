# Clerk authentication (public feed, gated details)

## Goal

Add Clerk authentication to truth-news: working sign-in and sign-up, session handling,
an auth-aware header, and login-gated news details. The home feed stays public.
Pipeline/API admin routes are not guarded by Clerk.

## Skills / sources

- Clerk Next.js quickstart and `clerkMiddleware` docs (Next.js 16 → `proxy.ts`)
- Protect content via `await auth.protect()` on the details page (not deprecated
  `createRouteMatcher` for auth gates)
- Project design tokens for Clerk `appearance`

## Existing code inspected

- `app/layout.tsx` — ThemeProvider only; no ClerkProvider
- `components/layout/site-header.tsx` / `site-header-menu.tsx` — static Login
- `app/(site)/news/[id]/page.tsx` — mock details page, no auth
- `app/(site)/page.tsx` — public home feed
- `.env.sample` / `.env.local` — Clerk key placeholders / existing keys
- No `proxy.ts` and no `@clerk/nextjs` before this task

## Decisions and assumptions

1. **Public:** `/`, `/sign-in`, `/sign-up`, `/design-system`
2. **Protected:** `/news/[id]` via `await auth.protect()` in the page component
3. **Keys:** reuse existing `.env.local` values; do **not** run `clerk init`
4. **Auth UI:** dedicated catch-all pages outside `(site)` layout
5. **Header:** Login → `/sign-in` when signed out; `<UserButton />` when signed in;
   Subscribe stays a static visual button
6. **Middleware:** `proxy.ts` runs `clerkMiddleware()` only (no route matcher auth)
7. **Appearance:** light theming via `appearance` (primary `#0D0D0F`, Poppins, medium radius)

## Files to create / modify

Create:

- `proxy.ts`
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- `prompts/clerk-authentication.md` (this file)

Modify:

- `app/layout.tsx` — `ClerkProvider` inside `<body>`
- `components/layout/site-header.tsx` — auth-aware actions
- `components/layout/site-header-menu.tsx` — auth-aware mobile actions
- `app/(site)/news/[id]/page.tsx` — `await auth.protect()`
- `.env.sample` — Clerk URL / fallback vars
- `.env.local` — same URL vars (keys already present)
- `package.json` — `@clerk/nextjs`

## Implementation requirements

1. `npm install @clerk/nextjs`
2. `proxy.ts` with `clerkMiddleware()` + standard matcher (include `/__clerk`)
3. `ClerkProvider` inside `<body>`, wrapping `ThemeProvider`
4. Sign-in / sign-up pages: full-height centered `<SignIn />` / `<SignUp />`
5. Header + mobile menu: Clerk `<Show when="signed-out|signed-in">` + `UserButton`
   (Core 3 — do not use removed `SignedIn` / `SignedOut`)
6. Details page: `await auth.protect()` before article load/render; `dynamic = "force-dynamic"`
7. Env vars:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

## Security requirements

- Only `NEXT_PUBLIC_*` Clerk vars reach the client; `CLERK_SECRET_KEY` is server-only
- Never commit `.env.local` or real keys
- No Supabase Auth
- Pipeline/cron routes remain unprotected by Clerk (separate secrets later)
- `auth.protect()` on the details page is the security boundary for article content

## Acceptance criteria

- `@clerk/nextjs` installed; `proxy.ts` present
- `ClerkProvider` wraps the app inside `<body>`
- `/sign-in` and `/sign-up` render and are public
- Header shows Login → `/sign-in` when signed out and `UserButton` when signed in
- `/` is public; `/news/[id]` redirects signed-out users to sign-in and returns after login
- `npm run typecheck`, `npm run lint`, and `npm run build` pass

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Manual: home public → open article → sign-in → return to article → sign out → redirect again

## Exact manual test steps

1. `npm run dev`
2. Open `http://localhost:3000` — loads without auth
3. Click an article → redirect to `/sign-in`
4. Sign in → land on the news details page
5. Confirm header shows `UserButton`
6. Sign out → revisit `/news/<id>` → redirect to sign-in again
