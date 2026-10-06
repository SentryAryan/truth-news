import "server-only";

import type { JoinedArticleRow } from "@/lib/supabase/queries/articles";
import { mapJoinedArticleToHomeArticle } from "@/lib/supabase/queries/articles";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { ReaderCount } from "@/lib/trending/constants";
import { rankTrendingArticles } from "@/lib/trending/rank";
import { loadTrendingCounts } from "@/lib/trending/snapshot";
import type { HomeArticle } from "@/lib/types/article-display";

const ID_CHUNK_SIZE = 15;

function isMissingRelationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("does not exist")
  );
}

async function loadAnalyzedRows(ids: string[]): Promise<JoinedArticleRow[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  const rows: JoinedArticleRow[] = [];

  for (let index = 0; index < ids.length; index += ID_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + ID_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("articles")
      .select("*, sources(*), article_analyses(*)")
      .not("analyzed_at", "is", null)
      .in("id", chunk);

    if (error) {
      if (isMissingRelationError(error.message)) {
        console.warn(
          "[trending] articles table missing — run npm run db:push",
        );
        return [];
      }
      throw new Error(`load trending articles failed: ${error.message}`);
    }

    rows.push(...((data as JoinedArticleRow[] | null) ?? []));
  }

  return rows;
}

function orderHomeArticles(
  counts: ReaderCount[],
  rows: JoinedArticleRow[],
): HomeArticle[] {
  const homeById = new Map<string, HomeArticle>();
  const rankable = rows.flatMap((row) => {
    const home = mapJoinedArticleToHomeArticle(row);
    if (!home) {
      return [];
    }
    homeById.set(row.id.toLowerCase(), home);
    return [{ id: row.id, publishedAt: row.published_at }];
  });

  return rankTrendingArticles(counts, rankable).flatMap((ranked) => {
    const home = homeById.get(ranked.articleId);
    return home ? [home] : [];
  });
}

export async function getTrendingHomeArticles(): Promise<HomeArticle[]> {
  try {
    const counts = await loadTrendingCounts();
    const rows = await loadAnalyzedRows(counts.map((count) => count.articleId));
    return orderHomeArticles(counts, rows);
  } catch (error) {
    console.error(
      "[trending] failed to load trending articles",
      error instanceof Error ? error.message : "unknown error",
    );
    return [];
  }
}
