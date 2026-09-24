import { Container } from "@/components/container";
import { Skeleton } from "@/components/ui/skeleton";

function AsideCardSkeleton({
  lines = 4,
  showBars = false,
}: {
  lines?: number;
  showBars?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="space-y-4 rounded-lg border border-border bg-bg-primary p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      {showBars ? (
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ) : null}
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton
            key={i}
            className={i === lines - 1 ? "h-3 w-3/4" : "h-3 w-full"}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

function RelatedCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex gap-3 rounded-lg border border-border bg-bg-primary p-3"
    >
      <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-[85%]" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

/**
 * Layout-faithful loading UI for `/news/[id]` (article + aside + newsletter).
 */
export function NewsDetailSkeleton() {
  return (
    <main
      className="flex-1 bg-bg-primary"
      aria-busy="true"
      aria-label="Loading article"
      role="status"
    >
      <span className="sr-only">Loading article</span>

      <Container className="py-6 sm:py-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:gap-8 xl:gap-12">
          <div className="min-w-0" aria-hidden="true">
            <Skeleton className="h-4 w-36" />
            <div className="mt-2 mb-4 space-y-2">
              <Skeleton className="h-8 w-full sm:h-10" />
              <Skeleton className="h-8 w-[92%] sm:h-10" />
              <Skeleton className="h-8 w-[70%] sm:h-10" />
            </div>

            <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
            </div>

            <div className="mb-6">
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-surface animate-pulse" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>

            <div className="mb-8 rounded-lg border border-border bg-bg-primary p-4">
              <Skeleton className="mb-3 h-4 w-32" />
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>

            <div className="space-y-5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[88%]" />
                </div>
              ))}
            </div>

            <section className="mt-10 border-t border-border pt-8">
              <Skeleton className="mb-4 h-6 w-40" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RelatedCardSkeleton />
                <RelatedCardSkeleton />
              </div>
            </section>
          </div>

          <aside
            aria-hidden="true"
            className="mt-8 space-y-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start"
          >
            <AsideCardSkeleton showBars lines={3} />
            <AsideCardSkeleton lines={5} />
            <AsideCardSkeleton showBars lines={4} />
          </aside>
        </div>
      </Container>

      <section aria-hidden="true" className="border-t border-border bg-surface">
        <Container className="flex flex-col items-stretch justify-between gap-6 py-10 sm:flex-row sm:items-center sm:gap-10 sm:py-12">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
            <Skeleton className="h-10 w-28 shrink-0 rounded-md" />
          </div>
        </Container>
      </section>
    </main>
  );
}
