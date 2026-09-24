# 014 — Home nav skeletons + OpenRouter rate-limit abort

## Goal

1. Make homepage filter/pagination navigations show card skeletons (route `loading.tsx` alone does not fire for searchParam-only soft nav).
2. When OpenRouter returns a free-model / rate-limit error during analyze or embed, stop further AI calls and retries and return the run summary immediately.

## Skills / code inspected

- Browser verification of `/?page=*` soft nav (Rendering… badge, no skeleton)
- `components/home/home-feed-filters.tsx` (`router.push`), `home-pagination.tsx` (`Link`)
- `app/(site)/(home)/loading.tsx`, `SiteHeader` `auth()` blocking layout
- `lib/pipeline/analyze.ts`, `analyze-article.ts`, `embed-article.ts`

## Decisions

### Skeletons

- Prefer **client pending UI**: wrap filter + pagination navigations so while a transition is pending, replace the article grid (and optionally category/toolbar pulse) with `HomeFeedSkeleton` feed portion — or render a shared `HomeFeedPendingShell`.
- Practical approach:
  1. Extract a client `HomeFeedClientShell` that owns `useTransition` / pending state.
  2. On filter `router.push` and pagination link clicks, set pending and show skeleton until navigation completes.
  3. Keep route `loading.tsx` for cold navigations into `/`.
- Avoid full layout remount; do not remove Clerk from header in this task unless required.

### Rate-limit abort

- Detect OpenRouter rate-limit messages (`Rate limit exceeded`, `free-models-per-day`, HTTP 429 if present).
- On first rate-limit during analysis or embedding:
  - Do not app-level retry that article.
  - Set `maxRetries: 0` for subsequent AI SDK calls once rate-limited is known, OR break the outer loop immediately.
  - Mark remaining pending in this run as skipped (or leave unprocessed).
  - Log clearly: `[analyze] rate limited — aborting remaining articles`.
  - Return `partial_success` or `failed` with errors including rate-limit reason.

## Acceptance

- [ ] Changing page / filters shows skeleton cards before new content
- [ ] Soft nav is still client-side (not full document reload)
- [ ] Rate-limit aborts remaining analyze/embed work without burning retries
- [ ] typecheck + lint + unit tests pass
