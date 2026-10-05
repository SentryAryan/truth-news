-- Migrate to vector(2048) for nvidia/nemotron-3-embed-1b:free
-- No IVFFlat: pgvector ANN indexes cap at 2000 dims; Nemotron is 2048.
drop index if exists public.article_analyses_embedding_idx;

update public.article_analyses set embedding = null;

alter table public.article_analyses
  alter column embedding type vector(2048);

drop function if exists public.match_related_articles(uuid, vector(1536), integer);
drop function if exists public.match_related_articles(uuid, vector, integer);

create or replace function public.match_related_articles(
  p_article_id  uuid,
  p_embedding   vector(2048),
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
