"use client";

import { ArticleCard } from "@/components/article-card";
import { IconBookmark } from "@/components/icons";
import { toggleSavedArticle } from "@/lib/saved/actions";
import type { HomeArticle } from "@/lib/types/article-display";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SavedArticlesListProps = {
  articles: HomeArticle[];
};

export function SavedArticlesList({ articles }: SavedArticlesListProps) {
  const router = useRouter();
  const [items, setItems] = useState(articles);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function unsave(article: HomeArticle) {
    setError("");
    setPendingId(article.id);
    const previous = items;
    setItems(previous.filter((item) => item.id !== article.id));

    startTransition(async () => {
      const result = await toggleSavedArticle(article.id);
      setPendingId(null);
      if (!result.ok || result.saved) {
        setItems(previous);
        setError(
          result.ok ? "Could not remove this article." : result.error,
        );
        return;
      }
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-body-md text-text-secondary">
        You have not saved any articles yet. Open a story and tap the bookmark
        to keep it here.
      </p>
    );
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 text-body-sm text-bias-left" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {items.map((article, index) => (
          <div key={article.id} className="relative h-full">
            <ArticleCard
              variant="feed"
              title={article.title}
              category={article.category}
              location={article.location}
              imageUrl={article.imageUrl}
              imageAlt={article.imageAlt}
              bias={article.bias}
              sourceCount={article.sourceCount}
              sentimentLabel={article.sentimentLabel}
              framingLabel={article.framingLabel}
              confidence={article.confidence}
              href={`/news/${article.id}`}
              priorityImage={index === 0}
            />
            <button
              type="button"
              aria-label={`Remove ${article.title} from saved`}
              disabled={pendingId === article.id}
              onClick={() => unsave(article)}
              className="absolute top-3 left-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-primary text-text-primary shadow-sm hover:bg-surface disabled:opacity-60"
            >
              <IconBookmark size={16} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
