import { BiasMeter } from "@/components/bias-meter";
import { Container } from "@/components/container";
import { AiSummaryCard } from "@/components/details/ai-summary-card";
import { BiasAnalysisCard } from "@/components/details/bias-analysis-card";
import { SourceBreakdownCard } from "@/components/details/source-breakdown-card";
import {
    IconBookmark,
    IconInfo,
    IconMore,
    IconShare,
} from "@/components/icons";
import { NewsletterBanner } from "@/components/newsletter-banner";
import { getArticleWithAnalysis } from "@/lib/supabase/queries/articles";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

type NewsDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return { title: "Sign in · truth-news" };
  }

  const { id } = await params;
  const article = await getArticleWithAnalysis(id);
  if (!article) {
    return { title: "Article not found · truth-news" };
  }
  return {
    title: `${article.title} · truth-news`,
    description: article.summary[0] ?? article.title,
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  await auth.protect();

  const { id } = await params;
  const article = await getArticleWithAnalysis(id);
  if (!article) {
    notFound();
  }

  return (
    <main className="flex-1 bg-bg-primary">
      <Container className="py-6 sm:py-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:gap-8 xl:gap-12">
          <article className="min-w-0">
            <p className="text-body-sm">
              <span className="font-medium text-text-primary">
                {article.category}
              </span>
              {article.location ? (
                <span className="text-text-secondary">
                  {" "}
                  · {article.location}
                </span>
              ) : null}
            </p>

            <h1 className="mt-2 mb-4 text-h2 font-bold leading-tight text-text-primary sm:text-h1">
              {article.title}
            </h1>

            <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-body-sm text-text-secondary">
                {article.author}
                <span aria-hidden="true"> | </span>
                {article.publishedDate}
                <span aria-hidden="true"> | </span>
                {article.readTime}
              </p>
              <div className="flex items-center gap-1 text-text-secondary">
                <button
                  type="button"
                  aria-label="Save"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-surface hover:text-text-primary"
                >
                  <IconBookmark size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Share"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-surface hover:text-text-primary"
                >
                  <IconShare size={18} />
                </button>
                <button
                  type="button"
                  aria-label="More"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-surface hover:text-text-primary"
                >
                  <IconMore size={18} />
                </button>
              </div>
            </div>

            <figure className="mb-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface">
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              </div>
              {article.imageCaption ? (
                <figcaption className="mt-2 text-caption text-text-secondary">
                  {article.imageCaption}
                </figcaption>
              ) : null}
            </figure>

            <div className="mb-8 rounded-lg border border-border bg-bg-primary p-4">
              <p className="mb-3 flex items-center gap-1.5 text-body-sm font-medium text-text-primary">
                Bias Distribution
                <IconInfo size={14} className="text-text-secondary" />
              </p>
              <BiasMeter
                left={article.bias.left}
                center={article.bias.center}
                right={article.bias.right}
              />
              <p className="mt-2 text-caption text-text-secondary">
                {article.sources} sources
              </p>
            </div>

            <div className="space-y-5">
              {article.body.map((paragraph, index) => (
                <p
                  key={`${article.id}-p-${index}`}
                  className="text-body-lg leading-relaxed text-text-primary"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          <aside className="mt-8 space-y-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
            <BiasAnalysisCard
              label={article.overallBiasLabel}
              percent={article.overallBiasPercent}
              sources={article.sources}
              bias={article.bias}
              sentimentLabel={article.sentimentLabel}
              confidence={article.confidence}
            />
            <AiSummaryCard
              summaryDate={article.summaryDate}
              summaryReadTime={article.summaryReadTime}
              summary={article.summary}
              disclaimer={article.disclaimer}
              framingNotes={article.framingNotes}
              loadedTerms={article.loadedTerms}
            />
            <SourceBreakdownCard
              sources={article.sources}
              bias={article.bias}
              sourceList={article.sourceList}
            />
          </aside>
        </div>
      </Container>

      <NewsletterBanner />
    </main>
  );
}
