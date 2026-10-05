"use server";

import { parseArticleId } from "@/lib/saved/article-id";
import type { ToggleSavedResult } from "@/lib/saved/types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const SAVE_FAILED = "Could not update saved articles. Try again.";

export async function toggleSavedArticle(
  articleId: string,
): Promise<ToggleSavedResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sign in to save articles." };
  }

  const id = parseArticleId(articleId);
  if (!id) {
    return { ok: false, error: "Invalid article." };
  }

  const supabase = createServiceRoleClient();
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, analyzed_at")
    .eq("id", id)
    .maybeSingle();

  if (articleError) {
    console.error("[saved] article lookup failed", articleError.message);
    return { ok: false, error: SAVE_FAILED };
  }

  if (!article?.analyzed_at) {
    return { ok: false, error: "This article cannot be saved." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("clerk_user_id", userId)
    .eq("article_id", id)
    .maybeSingle();

  if (existingError) {
    console.error("[saved] lookup failed", existingError.message);
    return { ok: false, error: SAVE_FAILED };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("saved_articles")
      .delete()
      .eq("id", existing.id)
      .eq("clerk_user_id", userId);

    if (deleteError) {
      console.error("[saved] delete failed", deleteError.message);
      return { ok: false, error: SAVE_FAILED };
    }

    revalidatePath("/saved");
    revalidatePath(`/news/${id}`);
    return { ok: true, saved: false };
  }

  const { error: insertError } = await supabase.from("saved_articles").insert({
    clerk_user_id: userId,
    article_id: id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      revalidatePath("/saved");
      revalidatePath(`/news/${id}`);
      return { ok: true, saved: true };
    }
    console.error("[saved] insert failed", insertError.message);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/saved");
  revalidatePath(`/news/${id}`);
  return { ok: true, saved: true };
}
