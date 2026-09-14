# 002 — Clerk Authentication

## Task goal

Add authentication to biasly with Clerk: working sign-in and sign-up, session handling,
and an auth-aware header. Public website pages (home, news details) stay public. Pipeline
routes are NOT guarded by Clerk — they use a server-side secret in a later step.

## Matching plan step

**Step 02 — Clerk authentication.**

## Skills read

- `.agents/skills/clerk/SKILL.md` (router) — routes setup → `clerk-setup`.
- `.agents/skills/clerk-setup/SKILL.md` — install, `ClerkProvider` inside `<body>`,
  Next.js → `proxy.ts`, current SDK = `@clerk/nextjs` v7+, keys env names.
- `.agents/skills/clerk-nextjs-patterns/SKILL.md` + `references/middleware-strategies.md` —
  public-first `clerkMiddleware`, server (`await auth()`) vs client (`useAuth`) boundary.
- `.agents/skills/next-best-practices/file-conventions.md` — Next.js 16 renames
  `middleware.ts` → **`proxy.ts`** (same API, `proxy()` export).

## Environment facts

- Next.js **16.2.7**, React 19 → current Clerk SDK, middleware file is **`proxy.ts`**.
- New project, no existing auth → fresh install (no migration).
- No `components.json` → no shadcn theme; theme Clerk via the `appearance` prop with
  biasly tokens instead.

## Decisions made (from user)

1. **API keys — paste dashboard keys.** Scaffold `.env.local` (gitignored) + a committed
   `.env.example` with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   placeholders plus the sign-in/up URL vars. User pastes real `pk_test_…` / `sk_test_…`.
2. **Auth UI — dedicated pages.** Catch-all routes `app/sign-in/[[...sign-in]]/page.tsx`
   and `app/sign-up/[[...sign-up]]/page.tsx` rendering Clerk `<SignIn/>` / `<SignUp/>`.

## Assumptions (small, reversible)

- **Middleware = public-first**, no protected routes yet (home/details are public; pipeline
  protection is a server secret in a later step). `proxy.ts` runs `clerkMiddleware` with the
  standard matcher so `auth()` is available app-wide; include a commented example showing
  how to protect future routes.
- **Header mapping:** `Login` → links to `/sign-in` when signed out; `Subscribe` stays a
  static visual button (billing is out of scope per AGENTS §10/§23). When signed in, show
  Clerk `<UserButton/>` in place of Login. Use `<SignedIn>` / `<SignedOut>` from
  `@clerk/nextjs`. Sign-up reachable via the link on the sign-in page (+ `/sign-up` route).
- **Clerk appearance:** light theming via `appearance` (primary color `#0D0D0F`, Poppins
  variable, medium radius) so components feel on-brand. No `@clerk/ui` package needed.
- Build/lint must pass without real keys present (ClerkProvider renders without keys; only
  runtime auth needs them). `.env.local` placeholders are non-functional until filled.

## Files to create / modify

Create:
- `proxy.ts` — `clerkMiddleware` (public-first) + matcher.
- `app/sign-in/[[...sign-in]]/page.tsx` — centered `<SignIn/>`.
- `app/sign-up/[[...sign-up]]/page.tsx` — centered `<SignUp/>`.
- `.env.example` — committed template of required Clerk env vars.
- `.env.local` — same vars with empty/placeholder values for the user to fill (gitignored).

Modify:
- `app/layout.tsx` — wrap children with `<ClerkProvider>` **inside `<body>`**, with
  `appearance` config; keep TopBar/Header/Footer chrome.
- `components/layout/site-header.tsx` — auth-aware actions (`SignedIn`/`SignedOut`,
  `UserButton`, Login link to `/sign-in`).
- `package.json` — add `@clerk/nextjs` (via `npm install @clerk/nextjs`).
- Confirm `.gitignore` ignores `.env*.local` (create-next-app default); add if missing.

## Implementation requirements

1. `npm install @clerk/nextjs`.
2. `proxy.ts` (project root):
   ```ts
   import { clerkMiddleware } from '@clerk/nextjs/server';
   export default clerkMiddleware();
   export const config = {
     matcher: [
       '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
       '/(api|trpc)(.*)',
     ],
   };
   ```
   Include a commented `createRouteMatcher` + `auth.protect()` example for future use.
3. `app/layout.tsx`: import `{ ClerkProvider }` from `@clerk/nextjs`; wrap the body
   contents (`<ClerkProvider appearance={{...}}>…</ClerkProvider>`) — provider INSIDE
   `<body>`, not around `<html>`.
4. Sign-in / sign-up pages: full-height centered container using biasly tokens, rendering
   `<SignIn />` / `<SignUp />` (catch-all segment).
5. Header: server component keeps rendering; use Clerk control components for the auth
   region. `await auth()` not needed in the header (control components handle state).
6. `.env.example` / `.env.local` vars:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
   ```

## Security requirements (AGENTS §18)

- Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is client-exposed; `CLERK_SECRET_KEY` is
  server-only and never imported into client code.
- Real keys live only in `.env.local`, which must be gitignored. `.env.example` holds
  placeholders only — no secrets committed.
- Do NOT use Supabase Auth (AGENTS §23). Clerk only.
- Pipeline/scheduled routes remain protected by a server secret later — not added here.
- No secrets logged.

## Acceptance criteria

- `@clerk/nextjs` installed; `proxy.ts` present with `clerkMiddleware` + matcher.
- `ClerkProvider` wraps the app inside `<body>`.
- `/sign-in` and `/sign-up` render Clerk components and are reachable.
- Header shows Login (→ `/sign-in`) + Subscribe when signed out, and `<UserButton/>` when
  signed in.
- Home and news pages remain public (no auth redirect).
- No Supabase Auth. Secret key not exposed to the browser. `.env.local` gitignored.
- `npm run lint` and `npm run build` pass without real keys.

## Checks to run

- `npm run lint`
- `npm run build`
- Note in plan that full runtime sign-in verification requires the user to paste real keys
  and run `npm run dev`.

## Plan update instructions

After implementation, update `plan.md`:
- Mark **Step 02 — Clerk authentication** complete; record files changed and checks run.
- Record decisions (paste-keys, dedicated pages), assumptions (public-first middleware,
  Subscribe static), and the follow-up that the user must paste real keys to test sign-in.
- Set next recommended step to **Step 03 — Supabase schema and data layer** (or Step 05
  details UI), per plan ordering.
