"use client";

import { ArticleCard } from "@/components/article-card";
import { CategoryBar } from "@/components/category-bar";
import { Container } from "@/components/container";
import {
    HomeFeedNavProvider,
    useHomeFeedNav,
} from "@/components/home/home-feed-nav";
import { HomeFeedCardsSkeleton } from "@/components/home/home-feed-skeleton";
import { HomeFeedToolbar } from "@/components/home/home-feed-toolbar";
import { TrendingRail } from "@/components/home/trending-rail";
import type { HomeFeedParams } from "@/lib/home-feed-params";
import type { HomeFilterSource } from "@/lib/supabase/queries/articles";
import type { HomeArticle } from "@/lib/types/article-display";

type HomeFeedViewProps = {
  sources: HomeFilterSource[];
  params: HomeFeedParams;
  articles: HomeArticle[];
  total: number;
  totalPages: number;
  hasFilters: boolean;
  trending: HomeArticle[];
};

function HomeFeedViewInner({
  sources,
  params,
  articles,
  total,
  totalPages,
  hasFilters,
  trending,
}: HomeFeedViewProps) {
  const { isPending } = useHomeFeedNav();

  return (
    <div className="flex-1 bg-surface">
      <CategoryBar sources={sources} params={params} />

      <Container className="py-6 sm:py-8">
        <TrendingRail articles={trending} />

        <HomeFeedToolbar
          variant="top"
          params={params}
          sources={sources}
          total={total}
          totalPages={totalPages}
        />

        {isPending ? (
          <HomeFeedCardsSkeleton count={Math.min(params.pageSize, 6)} />
        ) : articles.length === 0 ? (
          <p className="text-body-md text-text-secondary">
            {hasFilters ? (
              <>
                No articles match these filters. Try clearing bias, sentiment, or
                source, or choose a different page size.
              </>
            ) : (
              <>
                No articles yet. If this is a fresh setup, apply{" "}
                <code className="text-body-sm">supabase/schema.sql</code> and{" "}
                <code className="text-body-sm">supabase/seed.sql</code> in the
                Supabase SQL Editor. Analyzed stories appear here after scrape and
                analysis.
              </>
            )}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
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
                  priorityImage={trending.length === 0 && index === 0}
                />
              ))}
            </div>

            <HomeFeedToolbar
              variant="bottom"
              params={params}
              sources={sources}
              total={total}
              totalPages={totalPages}
            />
          </>
        )}
      </Container>
    </div>
  );
}

export function HomeFeedView(props: HomeFeedViewProps) {
  const navKey = [
    props.params.page,
    props.params.pageSize,
    props.params.bias ?? "",
    props.params.sentiment ?? "",
    props.params.source ?? "",
  ].join("|");

  return (
    <HomeFeedNavProvider navKey={navKey}>
      <HomeFeedViewInner {...props} />
    </HomeFeedNavProvider>
  );
}
