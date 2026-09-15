-- truth-news canonical schema (AGENTS.md §7)
-- Apply in Supabase Dashboard → SQL Editor.
-- No embedding / pgvector yet (added in §20).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type sentiment_label as enum ('positive', 'neutral', 'negative');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type bias_label as enum ('left', 'center', 'right', 'mixed', 'unclear');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type log_type as enum ('scrape', 'analysis', 'scheduled_pipeline');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type log_status as enum ('running', 'success', 'partial_success', 'failed');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  listing_url text not null unique,
  logo_url text,
  parser_strategy text not null default 'generic',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  original_url text not null unique,
  canonical_url text,
  title text not null,
  image_url text not null,
  published_at timestamptz not null,
  raw_text text not null,
  scraped_at timestamptz not null default now(),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_source_id_idx on public.articles (source_id);
create index if not exists articles_analyzed_at_idx on public.articles (analyzed_at);
create index if not exists articles_published_at_idx on public.articles (published_at desc);

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- article_analyses (no embedding yet)
-- ---------------------------------------------------------------------------

create table if not exists public.article_analyses (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles (id) on delete cascade,
  summary text not null,
  sentiment_score double precision not null
    check (sentiment_score >= -1 and sentiment_score <= 1),
  sentiment_label public.sentiment_label not null,
  bias_score double precision not null
    check (bias_score >= -1 and bias_score <= 1),
  bias_label public.bias_label not null,
  left_percentage integer not null check (left_percentage between 0 and 100),
  center_percentage integer not null check (center_percentage between 0 and 100),
  right_percentage integer not null check (right_percentage between 0 and 100),
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  framing_notes text[] not null default '{}',
  loaded_terms text[] not null default '{}',
  disclaimer text not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_analyses_percentages_sum_100
    check (left_percentage + center_percentage + right_percentage = 100)
);

drop trigger if exists article_analyses_set_updated_at on public.article_analyses;
create trigger article_analyses_set_updated_at
  before update on public.article_analyses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- logs (operational; service role only)
-- ---------------------------------------------------------------------------

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  log_type public.log_type not null,
  status public.log_status not null,
  sources_checked integer not null default 0,
  articles_found integer not null default 0,
  articles_inserted integer not null default 0,
  articles_analyzed integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- oxylabs_schedules / oxylabs_schedule_runs
-- schedule IDs stored as text (JS Number loses 64-bit precision)
-- ---------------------------------------------------------------------------

create table if not exists public.oxylabs_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  oxylabs_schedule_id text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists oxylabs_schedules_set_updated_at on public.oxylabs_schedules;
create trigger oxylabs_schedules_set_updated_at
  before update on public.oxylabs_schedules
  for each row execute function public.set_updated_at();

create table if not exists public.oxylabs_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.oxylabs_schedules (id) on delete cascade,
  oxylabs_run_id text,
  status text not null,
  articles_inserted integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists oxylabs_schedule_runs_schedule_id_idx
  on public.oxylabs_schedule_runs (schedule_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_analyses enable row level security;
alter table public.logs enable row level security;
alter table public.oxylabs_schedules enable row level security;
alter table public.oxylabs_schedule_runs enable row level security;

grant select on public.sources to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant select on public.article_analyses to anon, authenticated;

drop policy if exists "public can read active sources" on public.sources;
create policy "public can read active sources"
  on public.sources
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "public can read analyzed articles" on public.articles;
create policy "public can read analyzed articles"
  on public.articles
  for select
  to anon, authenticated
  using (analyzed_at is not null);

drop policy if exists "public can read article analyses" on public.article_analyses;
create policy "public can read article analyses"
  on public.article_analyses
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.articles a
      where a.id = article_id
        and a.analyzed_at is not null
    )
  );

-- logs / oxylabs_* : no public grants or policies (service role bypasses RLS)

comment on table public.sources is 'News homepage sources used by the scrape pipeline';
comment on table public.articles is 'Scraped articles; homepage shows rows with analyzed_at set';
comment on table public.article_analyses is 'AI framing/sentiment analysis; embedding added later';
comment on table public.logs is 'Pipeline run logs; service-role only';
comment on table public.oxylabs_schedules is 'Oxylabs Scheduler sync state; schedule IDs as text';
comment on table public.oxylabs_schedule_runs is 'Processed Oxylabs schedule runs';
