import {
    TRENDING_CANDIDATE_LIMIT,
    TRENDING_LIMIT,
    TRENDING_WINDOW_DAYS,
    type ReaderCount,
} from "@/lib/trending/constants";

const ARTICLE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ARTICLE_PATH =
  /^\/news\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export type RankableArticle = {
  id: string;
  publishedAt: string;
};

export function parseArticleIdFromPathname(pathname: string): string | null {
  const match = ARTICLE_PATH.exec(pathname);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isArticleUuid(value: string): boolean {
  return ARTICLE_UUID.test(value);
}

export function isSnapshotFresh(
  computedAt: string,
  now: Date,
  ttlMs: number,
): boolean {
  const then = Date.parse(computedAt);
  if (Number.isNaN(then)) {
    return false;
  }
  return now.getTime() - then < ttlMs;
}

export function rankTrendingArticles(
  counts: readonly ReaderCount[],
  articles: readonly RankableArticle[],
  limit: number = TRENDING_LIMIT,
): ReaderCount[] {
  const publishedAtById = new Map(
    articles.map((article) => [article.id.toLowerCase(), article.publishedAt]),
  );
  const bestById = new Map<string, number>();

  for (const count of counts) {
    const articleId = count.articleId.toLowerCase();
    if (!isArticleUuid(articleId)) {
      continue;
    }
    if (!Number.isFinite(count.readers) || count.readers < 1) {
      continue;
    }
    if (!publishedAtById.has(articleId)) {
      continue;
    }
    const previous = bestById.get(articleId);
    if (previous === undefined || count.readers > previous) {
      bestById.set(articleId, count.readers);
    }
  }

  return [...bestById.entries()]
    .map(([articleId, readers]) => ({ articleId, readers }))
    .sort((a, b) => {
      if (b.readers !== a.readers) {
        return b.readers - a.readers;
      }
      const aTime = Date.parse(publishedAtById.get(a.articleId) ?? "");
      const bTime = Date.parse(publishedAtById.get(b.articleId) ?? "");
      const aStamp = Number.isNaN(aTime) ? 0 : aTime;
      const bStamp = Number.isNaN(bTime) ? 0 : bTime;
      return bStamp - aStamp;
    })
    .slice(0, limit);
}

export function buildTrendingHogQl(): string {
  return `
SELECT
  extract(properties.$pathname, '^/news/([0-9a-fA-F-]{36})$') AS article_id,
  uniq(person_id) AS readers
FROM events
WHERE timestamp >= now() - INTERVAL ${TRENDING_WINDOW_DAYS} DAY
  AND event = '$pageview'
  AND match(properties.$pathname, '^/news/[0-9a-fA-F-]{36}$')
  AND NOT equals(properties.$virt_is_bot, true)
GROUP BY article_id
ORDER BY readers DESC
LIMIT ${TRENDING_CANDIDATE_LIMIT}
`.trim();
}
