import { ArticleCard } from "@/components/article-card";
import { CategoryBar } from "@/components/category-bar";
import { Container } from "@/components/container";
import { MOCK_ARTICLES } from "@/lib/mock-articles";

export default function HomePage() {
  return (
    <div className="flex-1 bg-surface">
      <CategoryBar />

      <Container className="py-6 sm:py-8">
        <h1 className="mb-4 text-h3 font-bold text-text-primary sm:mb-6 sm:text-h2">
          Top News
        </h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {MOCK_ARTICLES.map((article) => (
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
      </Container>
    </div>
  );
}
