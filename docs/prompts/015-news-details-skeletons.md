# 015 — News details page skeleton loaders

## Goal

Add industry-standard skeleton loaders for `/news/[id]` covering the full post-fetch layout (article column, sticky aside cards, related section, newsletter band) via route `loading.tsx` and client pending soft-nav between related articles.

## Skills / sources

- Design system: `001b` / `001` / `001c`
- Home skeleton pattern: `013`, `014`, `components/home/home-feed-skeleton.tsx`, `home-feed-nav.tsx`
- Live page: `app/(site)/news/[id]/page.tsx`

## Decisions

- Reuse `Skeleton` primitive; semantic tokens only.
- Do not skeleton site chrome (TopBar / SiteHeader / SiteFooter).
- Route `loading.tsx` under `news/[id]/` for home → details.
- Optimistic client pending (keyed by article id) for related-article soft nav.
- Preserve responsive `lg:grid` + sticky aside.

## Acceptance

- [ ] Navigating to `/news/[id]` shows full details skeleton
- [ ] Related article click shows skeleton until next article loads
- [ ] Layout breakpoints unchanged
- [ ] typecheck / lint / skeleton smoke test pass
