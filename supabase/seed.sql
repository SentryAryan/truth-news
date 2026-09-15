-- truth-news seed: 5 active news sources
-- Idempotent — safe to re-run (ON CONFLICT listing_url DO NOTHING).
-- Apply after schema.sql in Supabase Dashboard → SQL Editor.

insert into public.sources (name, listing_url, logo_url, parser_strategy, is_active)
values
  ('Reuters', 'https://www.reuters.com/', null, 'generic', true)
on conflict (listing_url) do nothing;

insert into public.sources (name, listing_url, logo_url, parser_strategy, is_active)
values
  ('BBC News', 'https://www.bbc.com/news', null, 'generic', true)
on conflict (listing_url) do nothing;

insert into public.sources (name, listing_url, logo_url, parser_strategy, is_active)
values
  ('The Guardian', 'https://www.theguardian.com/us-news', null, 'generic', true)
on conflict (listing_url) do nothing;

insert into public.sources (name, listing_url, logo_url, parser_strategy, is_active)
values
  ('Fox News', 'https://www.foxnews.com/', null, 'generic', true)
on conflict (listing_url) do nothing;

insert into public.sources (name, listing_url, logo_url, parser_strategy, is_active)
values
  ('NPR', 'https://www.npr.org/sections/news/', null, 'generic', true)
on conflict (listing_url) do nothing;
