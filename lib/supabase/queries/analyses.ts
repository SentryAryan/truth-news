import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
    ArticleAnalysis,
    ArticleAnalysisInsert,
} from "@/lib/supabase/types";

export async function upsertArticleAnalysis(
  row: ArticleAnalysisInsert,
): Promise<ArticleAnalysis> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("article_analyses")
    .upsert(row, { onConflict: "article_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`upsertArticleAnalysis failed: ${error.message}`);
  }

  return data;
}

export async function updateArticleEmbedding(
  articleId: string,
  embedding: number[],
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("article_analyses")
    .update({ embedding })
    .eq("article_id", articleId);

  if (error) {
    throw new Error(`updateArticleEmbedding failed: ${error.message}`);
  }
}
