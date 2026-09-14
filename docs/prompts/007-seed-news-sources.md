# 007 — Seed 5 Active News Sources

## Goal

Insert 5 active news sources into the Supabase `sources` table so scraping and scheduling have real targets to work against.

---

## Skills Read

- `AGENTS.md` — source schema requirements (section 7), scraping source rules (sections 8–9)
- `.agents/skills/supabase/SKILL.md` — service role client, RLS context

---

## Existing Code Inspected

- `supabase/schema.sql` — `sources` table definition (id, name, listing_url, parser_strategy, active, logo_url, created_at)
- `lib/supabase/service.ts` — `getServiceClient()` returns a typed Supabase service role client
- `lib/supabase/types.ts` — `Source` type and `Database['public']['Tables']['sources']['Insert']`
- `.env.local` — `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` present

---

## Decisions / Assumptions

- **No existing sources** — seeding fresh; the script uses `onConflict: listing_url` (upsert) so it is safe to re-run without creating duplicates.
- **5 sources** selected to span the political spectrum (center-left → center-right) for meaningful framing analysis:
  1. **Reuters** — `https://www.reuters.com` — center wire service, generic strategy
  2. **BBC News** — `https://www.bbc.com/news` — international, center
  3. **NPR** — `https://www.npr.org` — US public radio, center-left
  4. **The Guardian (US)** — `https://www.theguardian.com/us` — center-left
  5. **Fox News** — `https://www.foxnews.com` — center-right
- **parser_strategy**: set to `null` for all 5 initially; source-specific strategies will be added during scraping implementation if needed.
- **logo_url**: using each outlet's public favicon/icon URL (CDN-hosted, no auth required).
- **active**: `true` for all 5.
- Seeding is done via a one-off TypeScript script (`scripts/seed-sources.ts`) that runs with `npx tsx`. This keeps it reproducible and version-controlled.
- The script uses the service role client (bypasses RLS) and logs each inserted or skipped row.

---

## Files Likely to Change

| File | Action |
|------|--------|
| `scripts/seed-sources.ts` | Create — seed script |

No schema changes needed. No app code changes.

---

## Sources to Seed

| Name | listing_url | logo_url | parser_strategy |
|------|-------------|----------|-----------------|
| Reuters | https://www.reuters.com | https://www.reuters.com/pf/resources/images/reuters/logo-vertical-default.png | null |
| BBC News | https://www.bbc.com/news | https://nav.files.bbci.co.uk/orbit/3.0.0-462.f0601d5/img/bbc-blocks-dark.svg | null |
| NPR | https://www.npr.org | https://media.npr.org/chrome/npr_logo.png | null |
| The Guardian | https://www.theguardian.com/us | https://assets.guim.co.uk/images/guardian-logo-resting.svg | null |
| Fox News | https://www.foxnews.com | https://a57.foxnews.com/static.foxnews.com/foxnews.com/content/uploads/2018/01/fox-news-logo.png | null |

---

## Implementation Requirements

1. Create `scripts/seed-sources.ts`.
2. Import `createClient` from `@supabase/supabase-js` directly (not `server-only` since this runs outside Next.js).
3. Load env vars from `.env.local` using `dotenv/config`.
4. Build the 5 source insert rows using the `Database['public']['Tables']['sources']['Insert']` shape.
5. Call `.upsert(rows, { onConflict: 'listing_url', ignoreDuplicates: true })` to make the script idempotent.
6. Log each outcome: inserted count, skipped count, any errors.
7. Exit with code 1 on error so CI can catch failures.

---

## Security Requirements

- Script reads credentials only from `.env.local`; no keys hardcoded.
- Uses service role key (server-only context — a one-off script, not browser code).
- `.env.local` is already gitignored.

---

## Acceptance Criteria

- [ ] Running `npx tsx scripts/seed-sources.ts` completes without error.
- [ ] All 5 source rows appear in Supabase Dashboard → Table Editor → `sources`.
- [ ] Each row has `active = true`, correct `name`, `listing_url`.
- [ ] Re-running the script inserts 0 duplicate rows (idempotent).

---

## Checks to Run

```bash
npx tsc --noEmit
```

---

## Manual Test Steps

1. Start from project root with `.env.local` present.
2. Run:
   ```bash
   npx tsx scripts/seed-sources.ts
   ```
3. Observe terminal output — expect:
   ```
   [seed] Inserting 5 sources...
   [seed] Done. 5 inserted, 0 skipped.
   ```
4. Open Supabase Dashboard → Table Editor → `sources` and confirm 5 rows with `active = true`.
5. Re-run the script and confirm the output shows `0 inserted, 5 skipped` (idempotent).
