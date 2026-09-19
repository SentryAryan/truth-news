import type {
    DetailArticle,
    HomeArticle,
    OverallBiasLabel,
    RelatedStory,
    SourceEntry,
} from "@/lib/types/article-display";

function img(seed: string): string {
  return `https://picsum.photos/seed/${seed}/640/400`;
}

export const MOCK_ARTICLES: HomeArticle[] = [
  {
    id: "1",
    title:
      "Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report",
    category: "Politics",
    location: "United States",
    imageUrl: img("trump-iran"),
    bias: { left: 20, center: 31, right: 49 },
    sourceCount: 12,
  },
  {
    id: "2",
    title: "Markets rally as inflation data cools faster than expected",
    category: "Business",
    location: "Global",
    imageUrl: img("truth-news-home-2"),
    bias: { left: 18, center: 52, right: 30 },
    sourceCount: 9,
  },
  {
    id: "3",
    title: "Climate summit reaches fragile agreement on emissions targets",
    category: "Environment",
    location: "Europe",
    imageUrl: img("truth-news-home-3"),
    bias: { left: 41, center: 38, right: 21 },
    sourceCount: 15,
  },
  {
    id: "4",
    title: "Tech giants face new antitrust scrutiny in major markets",
    category: "Technology",
    location: "United States",
    imageUrl: img("truth-news-home-4"),
    bias: { left: 33, center: 40, right: 27 },
    sourceCount: 11,
  },
  {
    id: "5",
    title: "World Cup host cities finalize security and transit plans",
    category: "Sports",
    location: "International",
    imageUrl: img("truth-news-home-5"),
    bias: { left: 12, center: 68, right: 20 },
    sourceCount: 7,
  },
  {
    id: "6",
    title: "Health agencies update guidance on seasonal respiratory illness",
    category: "Health",
    location: "United States",
    imageUrl: img("truth-news-home-6"),
    bias: { left: 28, center: 49, right: 23 },
    sourceCount: 10,
  },
  {
    id: "7",
    title: "AI research labs announce joint safety evaluation standards",
    category: "Technology",
    location: "Global",
    imageUrl: img("truth-news-home-7"),
    bias: { left: 35, center: 45, right: 20 },
    sourceCount: 14,
  },
  {
    id: "8",
    title: "Local elections reshape city councils across swing districts",
    category: "Politics",
    location: "United States",
    imageUrl: img("truth-news-home-8"),
    bias: { left: 44, center: 22, right: 34 },
    sourceCount: 8,
  },
  {
    id: "9",
    title: "Extreme weather alerts expand as heat wave intensifies",
    category: "Environment",
    location: "North America",
    imageUrl: img("truth-news-home-9"),
    bias: { left: 38, center: 42, right: 20 },
    sourceCount: 13,
  },
  {
    id: "10",
    title: "Central bank signals cautious path on interest rate cuts",
    category: "Business",
    location: "United States",
    imageUrl: img("truth-news-home-10"),
    bias: { left: 22, center: 48, right: 30 },
    sourceCount: 16,
  },
  {
    id: "11",
    title: "Social platforms roll out new rules for political advertising",
    category: "Media",
    location: "Global",
    imageUrl: img("truth-news-home-11"),
    bias: { left: 30, center: 35, right: 35 },
    sourceCount: 6,
  },
  {
    id: "12",
    title: "Scientists report breakthrough in long-duration battery storage",
    category: "Science",
    location: "Asia",
    imageUrl: img("truth-news-home-12"),
    bias: { left: 25, center: 55, right: 20 },
    sourceCount: 9,
  },
];

export const HOME_CATEGORIES = [
  "World Cup",
  "IPL",
  "Social Media",
  "Business & Markets",
  "Health & Medicine",
  "Soccer",
  "Artificial Intelligence",
  "Arsenal FC",
  "Extreme Weather and Disasters",
] as const;

const PRIMARY_SOURCES: SourceEntry[] = [
  { name: "Fox News", bias: "right" },
  { name: "Wall Street Journal", bias: "center" },
  { name: "Reuters", bias: "center" },
  { name: "BBC", bias: "center" },
  { name: "CNN", bias: "left" },
  { name: "New York Times", bias: "center" },
  { name: "Washington Post", bias: "center" },
  { name: "Newsmax", bias: "right" },
];

const PRIMARY_BODY: string[] = [
  "President Donald Trump has sent Iran a revised peace proposal that hardens several conditions from an earlier draft, according to people familiar with the discussions, raising the stakes for negotiators racing to keep talks alive.",
  "The updated framework, delivered through intermediaries over the weekend, would impose tighter verification requirements on enrichment activity and expand the list of facilities subject to inspections, the sources said.",
  "Iranian officials have not publicly confirmed receipt of the document. Diplomats in the region said Tehran is reviewing the text while assessing whether the tougher terms leave enough room for a negotiated off-ramp.",
  "Administration officials framed the revision as a response to recent intelligence assessments and pressure from allies who wanted clearer timelines and consequences if commitments are missed.",
  "Critics argued the harder line could collapse fragile momentum built over months of shuttle diplomacy, while supporters said prior drafts were too permissive and invited delay.",
  "Markets in energy and shipping showed muted reaction Monday as traders waited for a formal Iranian response and for any signal from European partners mediating side channels.",
  "Lawmakers on Capitol Hill split along familiar lines, with some urging sustained pressure and others warning that maximalist demands risk another cycle of escalation.",
  "For now, the proposal remains confidential. Officials cautioned that multiple drafts may circulate before either side accepts a public framework, and that timelines could slip if verification language remains contested.",
];

const PRIMARY_SUMMARY: string[] = [
  "Washington circulated a tougher revised peace proposal to Iran via intermediaries.",
  "The draft expands inspection scope and tightens enrichment verification timelines.",
  "Tehran has not publicly confirmed the text while reviewing options with regional partners.",
  "Allies pushed for clearer consequences if commitments are missed; critics fear talks could stall.",
  "No public framework is expected until both sides settle contested verification language.",
];

function dominantLabel(bias: HomeArticle["bias"]): OverallBiasLabel {
  const { left, center, right } = bias;
  const max = Math.max(left, center, right);
  const leaders = (
    [
      ["left", left],
      ["center", center],
      ["right", right],
    ] as const
  ).filter(([, value]) => value === max);
  if (leaders.length !== 1) {
    return "mixed";
  }
  return leaders[0][0];
}

function dominantPercent(bias: HomeArticle["bias"]): number {
  return Math.max(bias.left, bias.center, bias.right);
}

function stubSources(count: number): SourceEntry[] {
  const pool: SourceEntry[] = [
    { name: "Reuters", bias: "center" },
    { name: "AP", bias: "center" },
    { name: "BBC", bias: "center" },
    { name: "CNN", bias: "left" },
    { name: "Fox News", bias: "right" },
    { name: "The Guardian", bias: "left" },
    { name: "WSJ", bias: "center" },
    { name: "Bloomberg", bias: "center" },
  ];
  const size = Math.min(Math.max(count, 3), pool.length);
  return pool.slice(0, size);
}

function stubDetailFromHome(
  article: HomeArticle,
  relatedIds: string[],
): DetailArticle {
  const label = dominantLabel(article.bias);
  const percent = dominantPercent(article.bias);
  return {
    id: article.id,
    category: article.category,
    location: article.location,
    title: article.title,
    author: "By truth-news Staff",
    publishedDate: "May 30, 2026",
    readTime: "8 min read",
    imageUrl: article.imageUrl,
    imageCaption: `${article.title}. Photo: file / truth-news`,
    bias: article.bias,
    sources: article.sourceCount,
    body: [
      `${article.title} continues to develop as reporters gather reaction from officials and analysts across ${article.location}.`,
      "Early coverage emphasizes competing frames around responsibility, timing, and what comes next for markets and the public.",
      "truth-news aggregates reporting across outlets and surfaces an AI-assisted framing estimate so readers can compare emphasis, not declare objective truth.",
      "Additional verification and follow-up reporting may revise the picture as primary sources publish more detail.",
    ],
    overallBiasLabel: label,
    overallBiasPercent: percent,
    summary: [
      `Coverage of “${article.title}” clusters around competing political and economic frames.`,
      "Outlet emphasis differs on causes, timelines, and which institutions bear responsibility.",
      "This stub summary is mock data for UI development only.",
    ],
    summaryDate: "May 30, 2026",
    summaryReadTime: "2 min read",
    sourceList: stubSources(article.sourceCount),
    relatedIds,
    sentimentLabel: article.sentimentLabel ?? "neutral",
    confidence: article.confidence ?? 0.5,
    framingNotes: ["Mock framing note for UI development."],
    loadedTerms: [],
    disclaimer:
      "AI estimates may not reflect actual editorial intent. Mock data only.",
  };
}

function relatedIdsFor(id: string, count = 6): string[] {
  return MOCK_ARTICLES.filter((article) => article.id !== id)
    .slice(0, count)
    .map((article) => article.id);
}

const PRIMARY_DETAIL: DetailArticle = {
  id: "1",
  category: "Politics",
  location: "United States",
  title: "Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report",
  author: "By David Morgan",
  publishedDate: "May 31, 2026",
  readTime: "12 min read",
  imageUrl: img("trump-iran"),
  imageCaption:
    "President Donald Trump in the Cabinet Room at the White House, Washington, D.C., May 30, 2026. Photo: Andrew Harnik/Getty Images",
  bias: { left: 20, center: 31, right: 49 },
  sources: 12,
  body: PRIMARY_BODY,
  overallBiasLabel: "right",
  overallBiasPercent: 49,
  summary: PRIMARY_SUMMARY,
  summaryDate: "May 31, 2026",
  summaryReadTime: "3 min read",
  sourceList: PRIMARY_SOURCES,
  relatedIds: relatedIdsFor("1", 6),
  sentimentLabel: "neutral",
  confidence: 0.72,
  framingNotes: [
    "Coverage emphasizes negotiation leverage and national security stakes.",
  ],
  loadedTerms: ["tougher terms", "peace proposal"],
  disclaimer:
    "Framing estimates are AI-assisted and based on article text — not an objective verdict.",
};

function buildDetailMap(): Record<string, DetailArticle> {
  const map: Record<string, DetailArticle> = { "1": PRIMARY_DETAIL };
  for (const article of MOCK_ARTICLES) {
    if (article.id === "1") {
      continue;
    }
    map[article.id] = stubDetailFromHome(article, relatedIdsFor(article.id, 6));
  }
  return map;
}

export const MOCK_DETAIL_ARTICLES: Record<string, DetailArticle> =
  buildDetailMap();

export function getMockDetailArticle(id: string): DetailArticle | undefined {
  return MOCK_DETAIL_ARTICLES[id];
}

export function getRelatedStories(article: DetailArticle): RelatedStory[] {
  return article.relatedIds
    .map((relatedId) => {
      const home = MOCK_ARTICLES.find((item) => item.id === relatedId);
      const detail = MOCK_DETAIL_ARTICLES[relatedId];
      if (!home || !detail) {
        return null;
      }
      return {
        id: home.id,
        category: home.category,
        location: home.location,
        title: home.title,
        imageUrl: home.imageUrl,
        publishedDate: detail.publishedDate,
        readTime: detail.readTime,
      } satisfies RelatedStory;
    })
    .filter((story): story is RelatedStory => story !== null);
}

export function getAllMockDetailIds(): string[] {
  return Object.keys(MOCK_DETAIL_ARTICLES);
}
