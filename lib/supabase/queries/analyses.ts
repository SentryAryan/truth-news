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
