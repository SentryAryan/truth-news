import { ArticleCard } from "@/components/article-card";
import type { HomeArticle } from "@/lib/types/article-display";

type TrendingRailProps = {
  articles: HomeArticle[];
};

export function TrendingRail({ articles }: TrendingRailProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 sm:mb-10" aria-labelledby="trending-heading">
      <h2
        id="trending-heading"
        className="text-h3 font-bold text-text-primary sm:text-h2"
      >
        Trending
      </h2>
      <p className="mt-1 text-caption text-text-secondary sm:text-body-sm">
        Most opened in the last 7 days
      </p>
      <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto sm:gap-6">
        {articles.map((article, index) => (
          <div
            key={article.id}
            className="w-[17.5rem] shrink-0 snap-start lg:w-[calc((100%-4.5rem)/4)]"
          >
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
          </div>
        ))}
      </div>
    </section>
  );
}
