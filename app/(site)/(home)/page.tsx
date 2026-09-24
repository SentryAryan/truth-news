import { HomeFeedView } from "@/components/home/home-feed-view";
import {
    parseHomeFeedParams,
    type HomeFeedSearchParams,
} from "@/lib/home-feed-params";
import {
    getActiveSourcesForFilter,
    getHomeArticlesPage,
} from "@/lib/supabase/queries/articles";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<HomeFeedSearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const rawParams = await searchParams;
  const parsed = parseHomeFeedParams(rawParams);
  const sources = await getActiveSourcesForFilter();

  const source =
    parsed.source && sources.some((s) => s.id === parsed.source)
      ? parsed.source
      : null;
  const params = { ...parsed, source };

  const pageResult = await getHomeArticlesPage(params);
  const feedParams = { ...params, page: pageResult.page };
  const hasFilters = Boolean(params.bias || params.sentiment || params.source);
  const { articles, total, totalPages } = pageResult;

  return (
    <HomeFeedView
      sources={sources}
      params={feedParams}
      articles={articles}
      total={total}
      totalPages={totalPages}
      hasFilters={hasFilters}
    />
  );
}
