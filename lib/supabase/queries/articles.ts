import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
    Article,
    ArticleAnalysis,
    ArticleInsert,
    ArticleWithAnalysis,
    BiasLabel,
    Source,
} from "@/lib/supabase/types";
import type {
    DetailArticle,
    HomeArticle,
    OverallBiasLabel,
    SourceBias,
} from "@/lib/types/article-display";

const URL_EXISTENCE_CHUNK_SIZE = 15;
const DEFAULT_HOME_LIMIT = 20;

function isMissingRelationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    (lower.includes("relation") && lower.includes("does not exist")) ||
    lower.includes("does not exist")
  );
}

type JoinedArticleRow = Article & {
  sources: Source | Source[] | null;
  article_analyses: ArticleAnalysis | ArticleAnalysis[] | null;
};

function asSingleSource(
  value: Source | Source[] | null | undefined,
): Source | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asSingleAnalysis(
  value: ArticleAnalysis | ArticleAnalysis[] | null | undefined,
): ArticleAnalysis | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function estimateReadTime(rawText: string): string {
  const words = rawText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function splitBody(rawText: string): string[] {
  return rawText
    .split(/\n{2,}|\r\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mapBiasLabelToSourceBias(label: BiasLabel): SourceBias {
  switch (label) {
    case "left":
      return "left";
    case "right":
      return "right";
    case "center":
    case "mixed":
    case "unclear":
      return "center";
    default: {
      const _exhaustive: never = label;
      return _exhaustive;
    }
  }
}

function toOverallBiasLabel(label: BiasLabel): OverallBiasLabel {
  return label;
}

function dominantPercent(analysis: ArticleAnalysis): number {
  return Math.max(
    analysis.left_percentage,
    analysis.center_percentage,
    analysis.right_percentage,
  );
}

function mapToHomeArticle(row: JoinedArticleRow): HomeArticle | null {
  const analysis = asSingleAnalysis(row.article_analyses);
  const source = asSingleSource(row.sources);
  if (!analysis || !source || !row.analyzed_at) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    category: source.name,
    location: "",
    imageUrl: row.image_url,
    imageAlt: row.title,
    bias: {
      left: analysis.left_percentage,
      center: analysis.center_percentage,
      right: analysis.right_percentage,
    },
    sourceCount: 1,
  };
}

function mapToDetailArticle(row: JoinedArticleRow): DetailArticle | null {
  const analysis = asSingleAnalysis(row.article_analyses);
  const source = asSingleSource(row.sources);
  if (!analysis || !source || !row.analyzed_at) {
    return null;
  }

  return {
    id: row.id,
    category: source.name,
    location: "",
    title: row.title,
    author: source.name,
    publishedDate: formatPublishedDate(row.published_at),
    readTime: estimateReadTime(row.raw_text),
    imageUrl: row.image_url,
    imageCaption: "",
    bias: {
      left: analysis.left_percentage,
      center: analysis.center_percentage,
      right: analysis.right_percentage,
    },
    sources: 1,
    body: splitBody(row.raw_text),
    overallBiasLabel: toOverallBiasLabel(analysis.bias_label),
    overallBiasPercent: dominantPercent(analysis),
    summary: [analysis.summary],
    summaryDate: row.analyzed_at ? formatPublishedDate(row.analyzed_at) : "",
    summaryReadTime: "",
    sourceList: [
      {
        name: source.name,
        bias: mapBiasLabelToSourceBias(analysis.bias_label),
      },
    ],
    relatedIds: [],
  };
}

export async function getLatestAnalyzedArticles(
  limit: number = DEFAULT_HOME_LIMIT,
): Promise<HomeArticle[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*, sources(*), article_analyses(*)")
    .not("analyzed_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error.message)) {
      console.warn(
        "[supabase] articles table missing — apply supabase/schema.sql in the Dashboard SQL Editor, then reload.",
        error.message,
      );
      return [];
    }
    throw new Error(`getLatestAnalyzedArticles failed: ${error.message}`);
  }

  return (data as JoinedArticleRow[] | null ?? [])
    .map(mapToHomeArticle)
    .filter((article): article is HomeArticle => article !== null);
}

export async function getArticleWithAnalysis(
  id: string,
): Promise<DetailArticle | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*, sources(*), article_analyses(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      console.warn(
        "[supabase] articles table missing — apply supabase/schema.sql in the Dashboard SQL Editor, then reload.",
        error.message,
      );
      return null;
    }
    throw new Error(`getArticleWithAnalysis failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapToDetailArticle(data as JoinedArticleRow);
}

export async function getExistingOriginalUrls(
  urls: string[],
): Promise<Set<string>> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) {
    return new Set();
  }

  const supabase = createServiceRoleClient();
  const existing = new Set<string>();

  for (let i = 0; i < unique.length; i += URL_EXISTENCE_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + URL_EXISTENCE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("articles")
      .select("original_url")
      .in("original_url", chunk);

    if (error) {
      throw new Error(`getExistingOriginalUrls failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      existing.add(row.original_url);
    }
  }

  return existing;
}

export async function insertArticles(
  rows: ArticleInsert[],
): Promise<Article[]> {
  if (rows.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("articles")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`insertArticles failed: ${error.message}`);
  }

  return data ?? [];
}

export async function setArticleAnalyzedAt(
  id: string,
  at: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("articles")
    .update({ analyzed_at: at })
    .eq("id", id);

  if (error) {
    throw new Error(`setArticleAnalyzedAt failed: ${error.message}`);
  }
}

export async function getPendingAnalysisArticles(
  limit: number = 20,
): Promise<ArticleWithAnalysis[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*, sources(*), article_analyses(*)")
    .order("scraped_at", { ascending: true })
    .limit(Math.max(limit * 3, limit));

  if (error) {
    throw new Error(`getPendingAnalysisArticles failed: ${error.message}`);
  }

  const pending = (data as JoinedArticleRow[] | null ?? [])
    .filter((row) => asSingleAnalysis(row.article_analyses) === null)
    .slice(0, limit)
    .map((row) => ({
      ...row,
      sources: asSingleSource(row.sources),
      article_analyses: null,
    }));

  return pending;
}
