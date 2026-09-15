-- Demo analyzed articles for UI display (idempotent).
-- Prerequisites: schema.sql + seed.sql (sources) already applied.
-- Safe to re-run: conflicts on original_url / article_id are ignored or upserted.

-- Fixed UUIDs keep /news/<id> links stable across re-seeds.
-- Source rows are resolved by listing_url.

with src as (
  select id, name, listing_url from public.sources
),
upserted_articles as (
  insert into public.articles (
    id,
    source_id,
    original_url,
    canonical_url,
    title,
    image_url,
    published_at,
    raw_text,
    scraped_at,
    analyzed_at
  )
  values
    (
      'a1000000-0000-4000-8000-000000000001'::uuid,
      (select id from src where listing_url = 'https://www.reuters.com/'),
      'https://www.reuters.com/demo/truth-news-climate-talks',
      'https://www.reuters.com/demo/truth-news-climate-talks',
      'Global climate talks reach tentative framework on emissions cuts',
      'https://picsum.photos/seed/truth-climate/960/540',
      now() - interval '2 hours',
      E'Negotiators in Geneva outlined a provisional framework aimed at accelerating emissions reductions among major economies.\n\nDiplomats said the draft leaves room for national flexibility while setting clearer reporting deadlines for 2030 targets.\n\nEnvironmental groups called the language a meaningful step, while industry associations urged caution on compliance costs.\n\nTalks are expected to resume next week with a focus on financing for developing nations.',
      now() - interval '90 minutes',
      now() - interval '60 minutes'
    ),
    (
      'a1000000-0000-4000-8000-000000000002'::uuid,
      (select id from src where listing_url = 'https://www.bbc.com/news'),
      'https://www.bbc.com/news/demo/truth-news-ai-regulation',
      'https://www.bbc.com/news/demo/truth-news-ai-regulation',
      'Lawmakers debate new rules for frontier AI models',
      'https://picsum.photos/seed/truth-ai/960/540',
      now() - interval '5 hours',
      E'A parliamentary committee heard competing proposals for licensing requirements on advanced AI systems.\n\nSupporters argue mandatory safety evaluations would reduce systemic risk without freezing research.\n\nCritics warned that broad licensing could concentrate power among a few large labs and slow open-source work.\n\nNo vote was scheduled, but several members said a draft bill could appear before summer recess.',
      now() - interval '4 hours',
      now() - interval '3 hours'
    ),
    (
      'a1000000-0000-4000-8000-000000000003'::uuid,
      (select id from src where listing_url = 'https://www.theguardian.com/us-news'),
      'https://www.theguardian.com/us-news/demo/truth-news-housing',
      'https://www.theguardian.com/us-news/demo/truth-news-housing',
      'City council advances affordable housing bond measure',
      'https://picsum.photos/seed/truth-housing/960/540',
      now() - interval '8 hours',
      E'The council voted to place a multi-billion-dollar housing bond on the November ballot after hours of public comment.\n\nBackers said the measure would fund thousands of new units near transit corridors.\n\nOpponents questioned debt service costs and argued private development incentives would be more efficient.\n\nIf approved by voters, spending would begin the following fiscal year under an independent oversight board.',
      now() - interval '7 hours',
      now() - interval '6 hours'
    ),
    (
      'a1000000-0000-4000-8000-000000000004'::uuid,
      (select id from src where listing_url = 'https://www.foxnews.com/'),
      'https://www.foxnews.com/demo/truth-news-border-policy',
      'https://www.foxnews.com/demo/truth-news-border-policy',
      'Officials clash over border staffing and asylum processing times',
      'https://picsum.photos/seed/truth-border/960/540',
      now() - interval '12 hours',
      E'Agency leaders presented conflicting data on wait times at major ports of entry during a heated hearing.\n\nOne side emphasized staffing shortages and courtroom backlogs as the primary drivers of delays.\n\nThe other argued policy changes, not resources, explain the current surge in pending cases.\n\nBoth parties agreed that clearer metrics would help the public evaluate progress.',
      now() - interval '11 hours',
      now() - interval '10 hours'
    ),
    (
      'a1000000-0000-4000-8000-000000000005'::uuid,
      (select id from src where listing_url = 'https://www.npr.org/sections/news/'),
      'https://www.npr.org/sections/news/demo/truth-news-vaccine',
      'https://www.npr.org/sections/news/demo/truth-news-vaccine',
      'Health agencies update seasonal vaccine guidance for high-risk groups',
      'https://picsum.photos/seed/truth-health/960/540',
      now() - interval '1 day',
      E'Updated guidance prioritizes earlier vaccination for older adults and people with chronic conditions.\n\nClinicians said supply is expected to be adequate, though rural clinics may see staggered deliveries.\n\nPublic health officials stressed that the recommendations are preventive and not a response to a new outbreak.\n\nPharmacies can begin scheduling appointments as shipments arrive over the next two weeks.',
      now() - interval '20 hours',
      now() - interval '18 hours'
    ),
    (
      'a1000000-0000-4000-8000-000000000006'::uuid,
      (select id from src where listing_url = 'https://www.reuters.com/'),
      'https://www.reuters.com/demo/truth-news-markets',
      'https://www.reuters.com/demo/truth-news-markets',
      'Markets steady as investors weigh jobs data and rate path',
      'https://picsum.photos/seed/truth-markets/960/540',
      now() - interval '30 hours',
      E'Stocks closed mixed after a stronger-than-expected employment report tempered expectations for rapid rate cuts.\n\nBond yields edged higher while the dollar firmed against major peers.\n\nAnalysts said the data keeps policymakers data-dependent heading into the next policy meeting.\n\nCorporate earnings later this week may shift attention back to sector-specific performance.',
      now() - interval '28 hours',
      now() - interval '26 hours'
    )
  on conflict (original_url) do update set
    title = excluded.title,
    image_url = excluded.image_url,
    published_at = excluded.published_at,
    raw_text = excluded.raw_text,
    analyzed_at = excluded.analyzed_at,
    source_id = excluded.source_id
  returning id
)
insert into public.article_analyses (
  article_id,
  summary,
  sentiment_score,
  sentiment_label,
  bias_score,
  bias_label,
  left_percentage,
  center_percentage,
  right_percentage,
  confidence,
  framing_notes,
  loaded_terms,
  disclaimer,
  model
)
values
  (
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'Delegates drafted a flexible emissions framework with clearer 2030 reporting deadlines; reactions split between environmental groups and industry.',
    0.15,
    'neutral',
    -0.12,
    'center',
    28,
    56,
    16,
    0.78,
    array['Emphasizes diplomatic compromise', 'Balances activist and industry reactions'],
    array['framework', 'flexibility', 'meaningful step'],
    'AI-estimated framing based on article text only — not an objective truth score.',
    'demo-seed'
  ),
  (
    'a1000000-0000-4000-8000-000000000002'::uuid,
    'Parliament debated licensing for frontier AI, with safety advocates favoring evaluations and critics warning about open-source impact.',
    0.05,
    'neutral',
    -0.18,
    'left',
    42,
    40,
    18,
    0.74,
    array['Centers regulatory safety arguments', 'Includes open-source concentration concerns'],
    array['licensing', 'systemic risk', 'open-source'],
    'AI-estimated framing based on article text only — not an objective truth score.',
    'demo-seed'
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    'A city council advanced a housing bond for the ballot, highlighting transit-oriented units while opponents flagged debt costs.',
    0.25,
    'positive',
    -0.34,
    'left',
    48,
    36,
    16,
    0.81,
    array['Leads with housing need and public support', 'Debt concerns appear later'],
    array['affordable housing', 'bond measure', 'oversight'],
    'AI-estimated framing based on article text only — not an objective truth score.',
    'demo-seed'
  ),
  (
    'a1000000-0000-4000-8000-000000000004'::uuid,
    'Hearing participants disputed whether border delays stem mainly from staffing shortfalls or from policy choices.',
    -0.2,
    'negative',
    0.36,
    'right',
    18,
    28,
    54,
    0.76,
    array['Highlights enforcement and backlog framing', 'Presents dueling causal narratives'],
    array['staffing shortages', 'policy changes', 'pending cases'],
    'AI-estimated framing based on article text only — not an objective truth score.',
    'demo-seed'
  ),
  (
    'a1000000-0000-4000-8000-000000000005'::uuid,
    'Agencies refreshed seasonal vaccine timing for high-risk groups and said supply should be adequate with staggered rural delivery.',
    0.3,
    'positive',
    0.02,
    'center',
    22,
    58,
    20,
    0.83,
    array['Clinical and logistics focus', 'Downplays alarm framing'],
    array['high-risk', 'preventive', 'staggered deliveries'],
    'AI-estimated framing based on article text only — not an objective truth score.',
    'demo-seed'
  ),
  (
    'a1000000-0000-4000-8000-000000000006'::uuid,
    'Markets reacted mildly to strong jobs data, with investors reassessing the pace of potential rate cuts.',
    0.0,
    'neutral',
    0.08,
    'center',
    20,
    52,
    28,
    0.8,
    array['Market-mechanics framing', 'Avoids partisan attribution'],
    array['rate cuts', 'data-dependent', 'employment report'],
    'AI-estimated framing based on article text only — not an objective truth score.',
    'demo-seed'
  )
on conflict (article_id) do update set
  summary = excluded.summary,
  sentiment_score = excluded.sentiment_score,
  sentiment_label = excluded.sentiment_label,
  bias_score = excluded.bias_score,
  bias_label = excluded.bias_label,
  left_percentage = excluded.left_percentage,
  center_percentage = excluded.center_percentage,
  right_percentage = excluded.right_percentage,
  confidence = excluded.confidence,
  framing_notes = excluded.framing_notes,
  loaded_terms = excluded.loaded_terms,
  disclaimer = excluded.disclaimer,
  model = excluded.model;
