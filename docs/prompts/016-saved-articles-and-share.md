# 016 — Saved articles and share modal

## Goal

Let a signed-in reader save an analyzed article to their account, open those saves on a responsive `/saved` page, and share the current article from the news details toolbar through a modal with working links to popular platforms.

## Skills read

- `.agents/skills/clerk` — session `userId` stays server-side; `/saved` and `/news/[id]` use `auth.protect()`
- `.agents/skills/supabase` — service-role writes, no joined-table `.eq` filters, schema plus `lib/supabase/types.ts`
- `docs/prompts/001b-design-system-primitives.md` — semantic tokens, existing `ArticleCard`, `Button`, `IconBookmark`, `IconShare`

## Existing code inspected

- `app/(site)/news/[id]/page.tsx` — inert Save and Share buttons
- `lib/site-nav.ts`, `components/layout/site-header.tsx`, `components/layout/site-header-menu.tsx` — nav items; Home `active` is hardcoded
- `components/article-card.tsx`, `components/home/home-feed-view.tsx` — feed card and responsive grid
- `supabase/schema.sql`, `lib/supabase/types.ts`, `lib/supabase/service.ts` — service-role client, RLS with no public grants on operational tables
- `lib/supabase/queries/articles.ts` — `HomeArticle` mapping from joined article rows

## Decisions and assumptions

- One `saved_articles` row per Clerk user and article. The browser never sends a user id. `auth()` supplies `userId`; writes use the service-role client.
- RLS is enabled with no anon or authenticated grants, matching `logs`.
- Only articles with `analyzed_at` set can be saved.
- Toggle is idempotent: insert when missing, delete when present.
- `/saved` calls `auth.protect()`. Signed-out visitors are redirected to Clerk sign-in.
- The Saved nav item is always visible. Active state follows the pathname (`/` and `/saved`). For You, Local, and Blindspot stay inactive placeholders.
- Share uses the current page URL and article title. Platforms open official intent URLs. Copy link uses the clipboard.
- Confirmation of the implementation plan is the approval to build this prompt.

## Files likely to change

- `docs/prompts/016-saved-articles-and-share.md`
- `supabase/schema.sql`
- `supabase/README.md`
- `lib/supabase/types.ts`
- `lib/supabase/queries/articles.ts`
- `lib/supabase/queries/saved-articles.ts`
- `lib/supabase/queries/index.ts`
- `lib/saved/article-id.ts`
- `lib/saved/actions.ts`
- `lib/share/platforms.ts`
- `lib/site-nav.ts`
- `components/layout/site-nav-links.tsx`
- `components/layout/site-header.tsx`
- `components/layout/site-header-menu.tsx`
- `components/details/article-actions.tsx`
- `components/details/share-article-dialog.tsx`
- `components/saved/saved-articles-list.tsx`
- `app/(site)/news/[id]/page.tsx`
- `app/(site)/saved/page.tsx`
- `app/(site)/saved/loading.tsx`
- `lib/saved/article-id.test.ts`
- `lib/share/platforms.test.ts`

## Implementation requirements

1. Add `saved_articles` (`id`, `clerk_user_id`, `article_id` cascade, `created_at`, unique user+article, index on user + created_at desc).
2. Server action `toggleSavedArticle` validates a UUID, requires a Clerk user, and only toggles analyzed articles.
3. Details toolbar Save button reflects saved state (`aria-pressed`, filled bookmark) and Share opens the modal.
4. `/saved` lists the user’s saves newest first with the homepage card grid, an empty state, a remove control, and a loading skeleton.
5. Add a Saved item to desktop nav and the mobile menu, with pathname-based active styling.
6. Share modal: Copy link, X, Facebook, LinkedIn, WhatsApp, Reddit, Telegram, and Email. Dialog traps focus, closes on Escape and backdrop, and returns focus to Share.

## Security requirements

- Do not accept `clerk_user_id` from the client.
- Do not expose the service-role key.
- Validate the article id before any query.
- Return a generic save error to the client; log the database message on the server.
- No admin secret on this user action. Authentication is the Clerk session.

## Acceptance criteria

- Saving an article on its details page creates one row for that user. Saving again removes it.
- `/saved` shows that article and removes it from the grid when the reader unsaves.
- Saved appears in the desktop nav and the mobile menu, and highlights on `/saved`.
- Each share control opens the matching intent URL or copies the article URL.
- The saved page grid is one column on small screens, two from `sm`, three from `lg`.

## Checks to run

```bash
npm run test
npm run typecheck
npm run lint
```

## Manual test steps

1. Apply the `saved_articles` section of `supabase/schema.sql` if the live database does not have the table yet.
2. Sign in, open a news details page, and click Save. The bookmark stays filled after refresh.
3. Open Saved from the header and from the hamburger menu. The article is listed. Remove it and confirm it leaves the grid.
4. On a details page, open Share. Copy link, then open X, Facebook, LinkedIn, WhatsApp, Reddit, Telegram, and Email and confirm each uses the article URL.
5. Check `/saved` at a narrow width and a desktop width.
