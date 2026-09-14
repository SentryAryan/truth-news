# 010 — News Details Page: Auth Guard

## Goal

Protect `/news/[id]` behind Clerk authentication. Unauthenticated users who visit a news details URL must be redirected to sign-in. The home page remains public.

---

## Skills read

- `.agents/skills/clerk-nextjs-patterns/references/middleware-strategies.md` — Public-First pattern with `createRouteMatcher`

---

## Existing code inspected

- `proxy.ts` — currently runs `clerkMiddleware()` with no route protection; all routes are public
- `app/news/[id]/page.tsx` — server component, no auth check
- `app/page.tsx` — home page, must stay public
- `app/sign-in/[[...sign-in]]/page.tsx` — Clerk sign-in page, must stay public
- `app/sign-up/[[...sign-up]]/page.tsx` — Clerk sign-up page, must stay public

---

## Decisions and assumptions

- Use the **Public-First** middleware pattern: protect only `/news/(.*)`, everything else stays public.
- `auth.protect()` in Clerk middleware automatically redirects unauthenticated users to the sign-in page configured via `NEXT_PUBLIC_CLERK_SIGN_IN_URL`.
- No changes needed to the page component itself — protection at the middleware layer is sufficient and correct for this use case.
- The home page, sign-in, sign-up, and all API routes keep their current access rules.

---

## Files likely to change

| File | Change |
|------|--------|
| `proxy.ts` | Add `createRouteMatcher` for `/news/(.*)` and call `auth.protect()` |

---

## Implementation requirements

1. Import `createRouteMatcher` from `@clerk/nextjs/server` in `proxy.ts`.
2. Define `isProtectedRoute = createRouteMatcher(['/news/(.*)'])`.
3. Change `clerkMiddleware()` to `clerkMiddleware(async (auth, req) => { if (isProtectedRoute(req)) await auth.protect(); })`.
4. Remove the now-outdated comment block that says the home page and news details pages must stay publicly readable.
5. Update the comment to accurately reflect the new intent: news details require authentication.
6. Do not change the `config.matcher` — it is already correct.

---

## Security requirements

- No server secrets involved; this is Clerk session auth only.
- Do not expose any credential or env var.
- The cron route (`/api/cron/pipeline`) remains protected by `CRON_SECRET`, not Clerk — no change needed there.

---

## Acceptance criteria

- Visiting `/news/<any-id>` while logged out redirects to `/sign-in`.
- After signing in, user is redirected back to the originally requested news details URL.
- The home page (`/`) is accessible without authentication.
- Sign-in and sign-up pages remain accessible without authentication.
- API routes are unaffected.

---

## Checks to run

```bash
npx tsc --noEmit
```

---

## Manual test steps

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000` — should load without auth.
3. Click any article card to navigate to `/news/<id>` — should redirect to sign-in.
4. Sign in — should redirect back to the news details page and display the article.
5. While signed in, navigate to `/news/<id>` directly — should load normally.
6. Sign out, then revisit `/news/<id>` — should redirect to sign-in again.
