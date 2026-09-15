/**
 * Seeds sources (if needed) + demo analyzed articles via service role.
 * Usage: node --env-file=.env.local scripts/seed-demo-articles.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SOURCES = [
  {
    name: "Reuters",
    listing_url: "https://www.reuters.com/",
    parser_strategy: "generic",
    is_active: true,
  },
  {
    name: "BBC News",
    listing_url: "https://www.bbc.com/news",
    parser_strategy: "generic",
    is_active: true,
  },
  {
    name: "The Guardian",
    listing_url: "https://www.theguardian.com/us-news",
    parser_strategy: "generic",
    is_active: true,
  },
  {
    name: "Fox News",
    listing_url: "https://www.foxnews.com/",
    parser_strategy: "generic",
    is_active: true,
  },
  {
    name: "NPR",
    listing_url: "https://www.npr.org/sections/news/",
    parser_strategy: "generic",
    is_active: true,
  },
];

const ARTICLES = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    listing_url: "https://www.reuters.com/",
    original_url: "https://www.reuters.com/demo/truth-news-climate-talks",
    title: "Global climate talks reach tentative framework on emissions cuts",
    image_url: "https://picsum.photos/seed/truth-climate/960/540",
    hoursAgo: 2,
    raw_text: [
      "Negotiators in Geneva outlined a provisional framework aimed at accelerating emissions reductions among major economies.",
      "Diplomats said the draft leaves room for national flexibility while setting clearer reporting deadlines for 2030 targets.",
      "Environmental groups called the language a meaningful step, while industry associations urged caution on compliance costs.",
      "Talks are expected to resume next week with a focus on financing for developing nations.",
    ].join("\n\n"),
    analysis: {
      summary:
        "Delegates drafted a flexible emissions framework with clearer 2030 reporting deadlines; reactions split between environmental groups and industry.",
      sentiment_score: 0.15,
      sentiment_label: "neutral",
      bias_score: -0.12,
      bias_label: "center",
      left_percentage: 28,
      center_percentage: 56,
      right_percentage: 16,
      confidence: 0.78,
      framing_notes: [
        "Emphasizes diplomatic compromise",
        "Balances activist and industry reactions",
      ],
      loaded_terms: ["framework", "flexibility", "meaningful step"],
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    listing_url: "https://www.bbc.com/news",
    original_url: "https://www.bbc.com/news/demo/truth-news-ai-regulation",
    title: "Lawmakers debate new rules for frontier AI models",
    image_url: "https://picsum.photos/seed/truth-ai/960/540",
    hoursAgo: 5,
    raw_text: [
      "A parliamentary committee heard competing proposals for licensing requirements on advanced AI systems.",
      "Supporters argue mandatory safety evaluations would reduce systemic risk without freezing research.",
      "Critics warned that broad licensing could concentrate power among a few large labs and slow open-source work.",
      "No vote was scheduled, but several members said a draft bill could appear before summer recess.",
    ].join("\n\n"),
    analysis: {
      summary:
        "Parliament debated licensing for frontier AI, with safety advocates favoring evaluations and critics warning about open-source impact.",
      sentiment_score: 0.05,
      sentiment_label: "neutral",
      bias_score: -0.18,
      bias_label: "left",
      left_percentage: 42,
      center_percentage: 40,
      right_percentage: 18,
      confidence: 0.74,
      framing_notes: [
        "Centers regulatory safety arguments",
        "Includes open-source concentration concerns",
      ],
      loaded_terms: ["licensing", "systemic risk", "open-source"],
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    listing_url: "https://www.theguardian.com/us-news",
    original_url: "https://www.theguardian.com/us-news/demo/truth-news-housing",
    title: "City council advances affordable housing bond measure",
    image_url: "https://picsum.photos/seed/truth-housing/960/540",
    hoursAgo: 8,
    raw_text: [
      "The council voted to place a multi-billion-dollar housing bond on the November ballot after hours of public comment.",
      "Backers said the measure would fund thousands of new units near transit corridors.",
      "Opponents questioned debt service costs and argued private development incentives would be more efficient.",
      "If approved by voters, spending would begin the following fiscal year under an independent oversight board.",
    ].join("\n\n"),
    analysis: {
      summary:
        "A city council advanced a housing bond for the ballot, highlighting transit-oriented units while opponents flagged debt costs.",
      sentiment_score: 0.25,
      sentiment_label: "positive",
      bias_score: -0.34,
      bias_label: "left",
      left_percentage: 48,
      center_percentage: 36,
      right_percentage: 16,
      confidence: 0.81,
      framing_notes: [
        "Leads with housing need and public support",
        "Debt concerns appear later",
      ],
      loaded_terms: ["affordable housing", "bond measure", "oversight"],
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    listing_url: "https://www.foxnews.com/",
    original_url: "https://www.foxnews.com/demo/truth-news-border-policy",
    title: "Officials clash over border staffing and asylum processing times",
    image_url: "https://picsum.photos/seed/truth-border/960/540",
    hoursAgo: 12,
    raw_text: [
      "Agency leaders presented conflicting data on wait times at major ports of entry during a heated hearing.",
      "One side emphasized staffing shortages and courtroom backlogs as the primary drivers of delays.",
      "The other argued policy changes, not resources, explain the current surge in pending cases.",
      "Both parties agreed that clearer metrics would help the public evaluate progress.",
    ].join("\n\n"),
    analysis: {
      summary:
        "Hearing participants disputed whether border delays stem mainly from staffing shortfalls or from policy choices.",
      sentiment_score: -0.2,
      sentiment_label: "negative",
      bias_score: 0.36,
      bias_label: "right",
      left_percentage: 18,
      center_percentage: 28,
      right_percentage: 54,
      confidence: 0.76,
      framing_notes: [
        "Highlights enforcement and backlog framing",
        "Presents dueling causal narratives",
      ],
      loaded_terms: ["staffing shortages", "policy changes", "pending cases"],
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    listing_url: "https://www.npr.org/sections/news/",
    original_url: "https://www.npr.org/sections/news/demo/truth-news-vaccine",
    title: "Health agencies update seasonal vaccine guidance for high-risk groups",
    image_url: "https://picsum.photos/seed/truth-health/960/540",
    hoursAgo: 24,
    raw_text: [
      "Updated guidance prioritizes earlier vaccination for older adults and people with chronic conditions.",
      "Clinicians said supply is expected to be adequate, though rural clinics may see staggered deliveries.",
      "Public health officials stressed that the recommendations are preventive and not a response to a new outbreak.",
      "Pharmacies can begin scheduling appointments as shipments arrive over the next two weeks.",
    ].join("\n\n"),
    analysis: {
      summary:
        "Agencies refreshed seasonal vaccine timing for high-risk groups and said supply should be adequate with staggered rural delivery.",
      sentiment_score: 0.3,
      sentiment_label: "positive",
      bias_score: 0.02,
      bias_label: "center",
      left_percentage: 22,
      center_percentage: 58,
      right_percentage: 20,
      confidence: 0.83,
      framing_notes: ["Clinical and logistics focus", "Downplays alarm framing"],
      loaded_terms: ["high-risk", "preventive", "staggered deliveries"],
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    listing_url: "https://www.reuters.com/",
    original_url: "https://www.reuters.com/demo/truth-news-markets",
    title: "Markets steady as investors weigh jobs data and rate path",
    image_url: "https://picsum.photos/seed/truth-markets/960/540",
    hoursAgo: 30,
    raw_text: [
      "Stocks closed mixed after a stronger-than-expected employment report tempered expectations for rapid rate cuts.",
      "Bond yields edged higher while the dollar firmed against major peers.",
      "Analysts said the data keeps policymakers data-dependent heading into the next policy meeting.",
      "Corporate earnings later this week may shift attention back to sector-specific performance.",
    ].join("\n\n"),
    analysis: {
      summary:
        "Markets reacted mildly to strong jobs data, with investors reassessing the pace of potential rate cuts.",
      sentiment_score: 0.0,
      sentiment_label: "neutral",
      bias_score: 0.08,
      bias_label: "center",
      left_percentage: 20,
      center_percentage: 52,
      right_percentage: 28,
      confidence: 0.8,
      framing_notes: [
        "Market-mechanics framing",
        "Avoids partisan attribution",
      ],
      loaded_terms: ["rate cuts", "data-dependent", "employment report"],
    },
  },
];

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function main() {
  const probe = await supabase.from("sources").select("id").limit(1);
  if (probe.error) {
    console.error(
      "Schema not ready:",
      probe.error.message,
      "\nApply supabase/schema.sql in the Dashboard SQL Editor first.",
    );
    process.exit(1);
  }

  const { error: sourceError } = await supabase
    .from("sources")
    .upsert(SOURCES, { onConflict: "listing_url" });
  if (sourceError) {
    console.error("Source seed failed:", sourceError.message);
    process.exit(1);
  }

  const { data: sources, error: listError } = await supabase
    .from("sources")
    .select("id, listing_url");
  if (listError || !sources) {
    console.error("Could not load sources:", listError?.message);
    process.exit(1);
  }

  const byListing = new Map(sources.map((s) => [s.listing_url, s.id]));

  for (const article of ARTICLES) {
    const sourceId = byListing.get(article.listing_url);
    if (!sourceId) {
      console.error("Missing source for", article.listing_url);
      process.exit(1);
    }

    const publishedAt = hoursAgoIso(article.hoursAgo);
    const analyzedAt = hoursAgoIso(article.hoursAgo - 0.5);

    const { error: articleError } = await supabase.from("articles").upsert(
      {
        id: article.id,
        source_id: sourceId,
        original_url: article.original_url,
        canonical_url: article.original_url,
        title: article.title,
        image_url: article.image_url,
        published_at: publishedAt,
        raw_text: article.raw_text,
        scraped_at: hoursAgoIso(article.hoursAgo - 0.25),
        analyzed_at: analyzedAt,
      },
      { onConflict: "original_url" },
    );

    if (articleError) {
      console.error("Article upsert failed:", article.title, articleError.message);
      process.exit(1);
    }

    const { error: analysisError } = await supabase
      .from("article_analyses")
      .upsert(
        {
          article_id: article.id,
          summary: article.analysis.summary,
          sentiment_score: article.analysis.sentiment_score,
          sentiment_label: article.analysis.sentiment_label,
          bias_score: article.analysis.bias_score,
          bias_label: article.analysis.bias_label,
          left_percentage: article.analysis.left_percentage,
          center_percentage: article.analysis.center_percentage,
          right_percentage: article.analysis.right_percentage,
          confidence: article.analysis.confidence,
          framing_notes: article.analysis.framing_notes,
          loaded_terms: article.analysis.loaded_terms,
          disclaimer:
            "AI-estimated framing based on article text only — not an objective truth score.",
          model: "demo-seed",
        },
        { onConflict: "article_id" },
      );

    if (analysisError) {
      console.error(
        "Analysis upsert failed:",
        article.title,
        analysisError.message,
      );
      process.exit(1);
    }

    console.log("Seeded:", article.id, "—", article.title);
  }

  console.log(`Done. Seeded ${ARTICLES.length} analyzed articles.`);
  console.log("Open http://localhost:3000 — then sign in to open /news/<id>.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
