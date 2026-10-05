import { Container } from "@/components/container";
import { HomeFeedCardsSkeleton } from "@/components/home/home-feed-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SavedLoading() {
  return (
    <main className="flex-1 bg-surface">
      <Container className="py-6 sm:py-8">
        <Skeleton className="mb-6 h-8 w-28" />
        <HomeFeedCardsSkeleton count={6} />
      </Container>
    </main>
  );
}
