import { HomeFeedFilters } from "@/components/home/home-feed-filters";
import { HomePagination } from "@/components/home/home-pagination";
import type { HomeFeedParams } from "@/lib/home-feed-params";
import type { HomeFilterSource } from "@/lib/supabase/queries/articles";

type HomeFeedToolbarProps = {
  params: HomeFeedParams;
  sources: HomeFilterSource[];
  totalPages: number;
  total: number;
  variant: "top" | "bottom";
};

export function HomeFeedToolbar({
  params,
  sources,
  totalPages,
  total,
  variant,
}: HomeFeedToolbarProps) {
  if (variant === "top") {
    return (
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-h3 font-bold text-text-primary sm:text-h2">
              Top News
            </h1>
            {total > 0 ? (
              <p className="mt-1 text-caption text-text-secondary sm:text-body-sm">
                {total} article{total === 1 ? "" : "s"}
                {totalPages > 1
                  ? ` · Page ${params.page} of ${totalPages}`
                  : null}
              </p>
            ) : null}
          </div>

          <HomeFeedFilters params={params} sources={sources} />
        </div>

        {totalPages > 1 ? (
          <HomePagination
            params={params}
            totalPages={totalPages}
            className="justify-start sm:justify-end"
          />
        ) : null}
      </div>
    );
  }

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 sm:mt-8">
      <HomePagination params={params} totalPages={totalPages} />
    </div>
  );
}
