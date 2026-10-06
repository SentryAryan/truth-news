export const TRENDING_WINDOW_DAYS = 7;
export const TRENDING_LIMIT = 4;
export const TRENDING_CANDIDATE_LIMIT = 12;
export const TRENDING_REFRESH_MS = 15 * 60 * 1000;
export const TRENDING_SNAPSHOT_ID = 1;

export type ReaderCount = {
  articleId: string;
  readers: number;
};

export type TrendingSnapshot = {
  articleIds: string[];
  readerCounts: Record<string, number>;
  computedAt: string;
};
