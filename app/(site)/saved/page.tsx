import { Container } from "@/components/container";
import { SavedArticlesList } from "@/components/saved/saved-articles-list";
import { listSavedArticles } from "@/lib/supabase/queries/saved-articles";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved · truth-news",
  description: "Articles you saved on truth-news.",
};

export default async function SavedPage() {
  const { userId } = await auth.protect();
  const { articles, unavailable } = await listSavedArticles(userId ?? "");

  return (
    <main className="flex-1 bg-surface">
      <Container className="py-6 sm:py-8">
        <h1 className="mb-6 text-h2 font-bold text-text-primary">Saved</h1>
        {unavailable ? (
          <p className="text-body-md text-text-secondary">
            Saved articles are not available yet. From the repo, run{" "}
            <code className="text-body-sm">npm run db:push</code>, then reload.
          </p>
        ) : (
          <SavedArticlesList
            key={articles.map((article) => article.id).join(",")}
            articles={articles}
          />
        )}
      </Container>
    </main>
  );
}
