import { describe, expect, it, vi } from "vitest";

import { TRENDING_REFRESH_MS, type TrendingSnapshot } from "@/lib/trending/constants";
import { resolveTrendingCounts } from "@/lib/trending/resolve";

const articleId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-10-06T12:00:00.000Z");

function snapshot(ageMs: number): TrendingSnapshot {
  return {
    articleIds: [articleId],
    readerCounts: { [articleId]: 3 },
    computedAt: new Date(now.getTime() - ageMs).toISOString(),
  };
}

describe("resolveTrendingCounts", () => {
  it("skips PostHog when the snapshot is fresh", async () => {
    const refresh = vi.fn();
    const result = await resolveTrendingCounts({
      now,
      snapshot: snapshot(TRENDING_REFRESH_MS - 1_000),
      refresh,
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(result).toEqual({
      counts: [{ articleId, readers: 3 }],
      refreshed: false,
    });
  });

  it("refreshes a stale snapshot", async () => {
    const nextId = "22222222-2222-4222-8222-222222222222";
    const refresh = vi.fn().mockResolvedValue([{ articleId: nextId, readers: 8 }]);
    const result = await resolveTrendingCounts({
      now,
      snapshot: snapshot(TRENDING_REFRESH_MS),
      refresh,
    });

    expect(refresh).toHaveBeenCalledOnce();
    expect(result).toEqual({
      counts: [{ articleId: nextId, readers: 8 }],
      refreshed: true,
    });
  });

  it("falls back to the last snapshot when PostHog fails", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("posthog down"));
    const result = await resolveTrendingCounts({
      now,
      snapshot: snapshot(TRENDING_REFRESH_MS + 1),
      refresh,
    });

    expect(result).toEqual({
      counts: [{ articleId, readers: 3 }],
      refreshed: false,
    });
  });

  it("returns an empty list when refresh fails and no snapshot exists", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("posthog down"));
    const result = await resolveTrendingCounts({
      now,
      snapshot: null,
      refresh,
    });

    expect(result).toEqual({ counts: [], refreshed: false });
  });
});
