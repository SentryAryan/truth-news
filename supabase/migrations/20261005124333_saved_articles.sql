-- saved_articles (per Clerk user; service-role writes only)
-- Apply with: npm run db:push

create table if not exists public.saved_articles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (clerk_user_id, article_id)
);

create index if not exists saved_articles_user_created_idx
  on public.saved_articles (clerk_user_id, created_at desc);

alter table public.saved_articles enable row level security;

comment on table public.saved_articles is 'Articles a Clerk user saved; service-role only';
