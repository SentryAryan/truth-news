import { describe, expect, it } from "vitest";

import { TRENDING_LIMIT, TRENDING_REFRESH_MS } from "@/lib/trending/constants";
import {
    buildTrendingHogQl,
    isSnapshotFresh,
    parseArticleIdFromPathname,
    rankTrendingArticles,
} from "@/lib/trending/rank";

const older = "11111111-1111-4111-8111-111111111111";
const newer = "22222222-2222-4222-8222-222222222222";
const third = "33333333-3333-4333-8333-333333333333";
const fourth = "44444444-4444-4444-8444-444444444444";
const fifth = "55555555-5555-4555-8555-555555555555";
const unknown = "66666666-6666-4666-8666-666666666666";

describe("parseArticleIdFromPathname", () => {
  it("reads a news article uuid", () => {
    expect(parseArticleIdFromPathname(`/news/${older}`)).toBe(older);
  });

  it("rejects other paths", () => {
    expect(parseArticleIdFromPathname("/")).toBeNull();
    expect(parseArticleIdFromPathname("/news/not-an-id")).toBeNull();
    expect(parseArticleIdFromPathname(`/saved`)).toBeNull();
  });
});

describe("isSnapshotFresh", () => {
  const now = new Date("2026-10-06T12:00:00.000Z");

  it("is fresh inside the ttl and stale at the boundary", () => {
    expect(
      isSnapshotFresh(
        new Date(now.getTime() - TRENDING_REFRESH_MS + 1).toISOString(),
        now,
        TRENDING_REFRESH_MS,
      ),
    ).toBe(true);
    expect(
      isSnapshotFresh(
        new Date(now.getTime() - TRENDING_REFRESH_MS).toISOString(),
        now,
        TRENDING_REFRESH_MS,
      ),
    ).toBe(false);
  });

  it("treats an unreadable timestamp as stale", () => {
    expect(isSnapshotFresh("not-a-date", now, TRENDING_REFRESH_MS)).toBe(false);
  });
});

describe("rankTrendingArticles", () => {
  const articles = [
    { id: older, publishedAt: "2026-10-01T00:00:00.000Z" },
    { id: newer, publishedAt: "2026-10-06T00:00:00.000Z" },
    { id: third, publishedAt: "2026-10-03T00:00:00.000Z" },
    { id: fourth, publishedAt: "2026-10-04T00:00:00.000Z" },
    { id: fifth, publishedAt: "2026-10-05T00:00:00.000Z" },
  ];

  it("drops unknown ids and ranks by readers, then published date", () => {
    const ranked = rankTrendingArticles(
      [
        { articleId: unknown, readers: 99 },
        { articleId: older, readers: 4 },
        { articleId: newer, readers: 4 },
        { articleId: third, readers: 2 },
        { articleId: "not-a-uuid", readers: 50 },
        { articleId: fourth, readers: 0 },
      ],
      articles,
    );

    expect(ranked.map((row) => row.articleId)).toEqual([newer, older, third]);
  });

  it("caps the list", () => {
    const ranked = rankTrendingArticles(
      [
        { articleId: older, readers: 1 },
        { articleId: newer, readers: 5 },
        { articleId: third, readers: 4 },
        { articleId: fourth, readers: 3 },
        { articleId: fifth, readers: 2 },
      ],
      articles,
    );

    expect(ranked).toHaveLength(TRENDING_LIMIT);
    expect(ranked[0]?.articleId).toBe(newer);
  });
});

describe("buildTrendingHogQl", () => {
  it("counts unique readers of article pageviews over 7 days and skips bots", () => {
    const query = buildTrendingHogQl();
    expect(query).toContain("event = '$pageview'");
    expect(query).toContain("INTERVAL 7 DAY");
    expect(query).toContain("uniq(person_id)");
    expect(query).toContain("NOT equals(properties.$virt_is_bot, true)");
    expect(query).toContain("LIMIT 12");
  });
});
