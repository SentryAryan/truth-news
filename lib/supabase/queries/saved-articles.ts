import "server-only";

import {
    mapJoinedArticleToHomeArticle,
    type JoinedArticleRow,
} from "@/lib/supabase/queries/articles";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { HomeArticle } from "@/lib/types/article-display";

export type SavedArticlesResult = {
  articles: HomeArticle[];
  unavailable: boolean;
};

type SavedArticleJoinRow = {
  created_at: string;
  articles: JoinedArticleRow | JoinedArticleRow[] | null;
};

function isMissingRelationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    (lower.includes("relation") && lower.includes("does not exist")) ||
    lower.includes("does not exist")
  );
}

function asSingleArticle(
  value: JoinedArticleRow | JoinedArticleRow[] | null,
): JoinedArticleRow | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function isArticleSaved(
  clerkUserId: string,
  articleId: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .eq("article_id", articleId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      return false;
    }
    throw new Error(`isArticleSaved failed: ${error.message}`);
  }

  return Boolean(data);
}

export async function listSavedArticles(
  clerkUserId: string,
): Promise<SavedArticlesResult> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("saved_articles")
    .select("created_at, articles(*, sources(*), article_analyses(*))")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error.message)) {
      console.warn(
        "[supabase] saved_articles table missing — run npm run db:push.",
        error.message,
      );
      return { articles: [], unavailable: true };
    }
    throw new Error(`listSavedArticles failed: ${error.message}`);
  }

  const articles = ((data as SavedArticleJoinRow[] | null) ?? [])
    .map((row) => {
      const article = asSingleArticle(row.articles);
      return article ? mapJoinedArticleToHomeArticle(article) : null;
    })
    .filter((article): article is HomeArticle => article !== null);

  return { articles, unavailable: false };
}
