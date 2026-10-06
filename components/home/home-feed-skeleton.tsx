import { Container } from "@/components/container";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_SKELETON_COUNT = 6;
const CATEGORY_CHIP_COUNT = 6;
const FILTER_CONTROL_COUNT = 4;

export function ArticleCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-bg-primary shadow-sm"
    >
      <div
        aria-hidden="true"
        className="aspect-[16/10] w-full animate-pulse bg-surface"
      />
      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
        <Skeleton className="h-3 w-1/3" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="mt-auto h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Card grid only — used while soft-navigating filters/pagination with chrome kept. */
export function HomeFeedCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading articles"
      role="status"
    >
      <span className="sr-only">Loading articles</span>
      {Array.from({ length: count }, (_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Layout-stable homepage loading UI for soft navigations (filters, pagination, category chips).
 */
export function HomeFeedSkeleton() {
  return (
    <div
      className="flex-1 bg-surface"
      aria-busy="true"
      aria-label="Loading articles"
      role="status"
    >
      <span className="sr-only">Loading articles</span>

      <div className="border-b border-border bg-bg-primary">
        <div className="mx-auto flex w-full max-w-[var(--container-truth-news)] items-center gap-1.5 px-4 py-2.5 sm:gap-2 sm:px-6 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden sm:gap-2">
            {Array.from({ length: CATEGORY_CHIP_COUNT }, (_, i) => (
              <Skeleton
                key={i}
                className="h-8 w-16 shrink-0 rounded-full sm:w-20"
              />
            ))}
          </div>
        </div>
      </div>

      <Container className="py-6 sm:py-8">
        <div
          className="mb-8 sm:mb-10"
          aria-label="Loading trending"
        >
          <Skeleton className="h-8 w-32 sm:h-9 sm:w-40" />
          <Skeleton className="mt-2 h-3 w-48" />
          <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-hidden sm:gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="w-[17.5rem] shrink-0 snap-start lg:w-[calc((100%-4.5rem)/4)]"
              >
                <ArticleCardSkeleton />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-8 w-36 sm:h-9 sm:w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {Array.from({ length: FILTER_CONTROL_COUNT }, (_, i) => (
                <Skeleton
                  key={i}
                  className="h-9 w-[7.5rem] rounded-md sm:h-10"
                />
              ))}
            </div>
          </div>
          <Skeleton className="h-8 w-48 self-start sm:self-end" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: CARD_SKELETON_COUNT }, (_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>

        <div className="mt-6 flex justify-center sm:mt-8">
          <Skeleton className="h-8 w-56" />
        </div>
      </Container>
    </div>
  );
}
