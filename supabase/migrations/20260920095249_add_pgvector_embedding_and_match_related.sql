-- pgvector + Related Articles
create extension if not exists vector;

alter table public.article_analyses
  add column if not exists embedding vector(1536);

create index if not exists article_analyses_embedding_idx
  on public.article_analyses
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_related_articles(
  p_article_id  uuid,
  p_embedding   vector(1536),
  p_match_count int default 5
)
returns table (
  id           uuid,
  title        text,
  image_url    text,
  published_at timestamptz,
  source_name  text
)
language sql
stable
security invoker
as $$
  select
    a.id,
    a.title,
    a.image_url,
    a.published_at,
    s.name as source_name
  from public.article_analyses aa
  join public.articles a on a.id = aa.article_id
  join public.sources  s on s.id = a.source_id
  where aa.embedding is not null
    and a.analyzed_at is not null
    and a.id <> p_article_id
  order by aa.embedding <=> p_embedding
  limit p_match_count;
$$;

comment on column public.article_analyses.embedding is 'OpenRouter embedding (1536 dims) for related articles';
