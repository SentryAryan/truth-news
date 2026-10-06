-- Cached PostHog trending article ids (service-role only).
-- Apply with: npm run db:push

create table if not exists public.trending_snapshots (
  id integer primary key default 1 check (id = 1),
  article_ids uuid[] not null default '{}',
  reader_counts jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

alter table public.trending_snapshots enable row level security;

comment on table public.trending_snapshots is 'Cached PostHog trending article ids; service-role only';
