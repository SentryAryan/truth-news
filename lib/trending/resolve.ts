import {
    TRENDING_REFRESH_MS,
    type ReaderCount,
    type TrendingSnapshot,
} from "@/lib/trending/constants";
import { isArticleUuid, isSnapshotFresh } from "@/lib/trending/rank";

export type ResolveTrendingInput = {
  now: Date;
  snapshot: TrendingSnapshot | null;
  ttlMs?: number;
  refresh: () => Promise<ReaderCount[]>;
};

export type ResolveTrendingResult = {
  counts: ReaderCount[];
  refreshed: boolean;
};

export function countsFromSnapshot(snapshot: TrendingSnapshot): ReaderCount[] {
  return snapshot.articleIds.flatMap((articleId) => {
    const id = articleId.toLowerCase();
    if (!isArticleUuid(id)) {
      return [];
    }
    const readers = snapshot.readerCounts[articleId] ?? snapshot.readerCounts[id];
    if (typeof readers !== "number" || !Number.isFinite(readers) || readers < 1) {
      return [];
    }
    return [{ articleId: id, readers }];
  });
}

export async function resolveTrendingCounts(
  input: ResolveTrendingInput,
): Promise<ResolveTrendingResult> {
  const ttlMs = input.ttlMs ?? TRENDING_REFRESH_MS;
  const cached = input.snapshot ? countsFromSnapshot(input.snapshot) : [];
  const fresh =
    input.snapshot !== null &&
    isSnapshotFresh(input.snapshot.computedAt, input.now, ttlMs);

  if (fresh) {
    return { counts: cached, refreshed: false };
  }

  try {
    const counts = await input.refresh();
    return { counts, refreshed: true };
  } catch (error) {
    console.error(
      "[trending] PostHog refresh failed; serving the last snapshot when one exists",
      error instanceof Error ? error.message : "unknown error",
    );
    return { counts: cached, refreshed: false };
  }
}
