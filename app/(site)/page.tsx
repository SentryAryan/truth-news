import { ArticleCard } from "@/components/article-card";
import { CategoryBar } from "@/components/category-bar";
import { Container } from "@/components/container";
import { getLatestAnalyzedArticles } from "@/lib/supabase/queries/articles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await getLatestAnalyzedArticles();

  return (
    <div className="flex-1 bg-surface">
      <CategoryBar />

      <Container className="py-6 sm:py-8">
        <h1 className="mb-4 text-h3 font-bold text-text-primary sm:mb-6 sm:text-h2">
          Top News
        </h1>

        {articles.length === 0 ? (
          <p className="text-body-md text-text-secondary">
            No articles yet. If this is a fresh setup, apply{" "}
            <code className="text-body-sm">supabase/schema.sql</code> and{" "}
            <code className="text-body-sm">supabase/seed.sql</code> in the
            Supabase SQL Editor. Analyzed stories appear here after scrape and
            analysis.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {articles.map((article) => (
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
                href={`/news/${article.id}`}
              />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
