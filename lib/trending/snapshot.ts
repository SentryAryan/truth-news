import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
    TRENDING_SNAPSHOT_ID,
    type ReaderCount,
    type TrendingSnapshot,
} from "@/lib/trending/constants";
import { queryPosthogTrending, readPosthogQueryConfig } from "@/lib/trending/posthog";
import { countsFromSnapshot, resolveTrendingCounts } from "@/lib/trending/resolve";

function isMissingRelationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("does not exist")
  );
}

function isReaderCountRecord(value: unknown): value is Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) => typeof entry === "number" && Number.isFinite(entry),
  );
}

async function readSnapshot(): Promise<TrendingSnapshot | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("trending_snapshots")
    .select("article_ids, reader_counts, computed_at")
    .eq("id", TRENDING_SNAPSHOT_ID)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      console.warn(
        "[trending] trending_snapshots table missing — run npm run db:push",
      );
      return null;
    }
    throw new Error(`read trending snapshot failed: ${error.message}`);
  }

  if (!data || !isReaderCountRecord(data.reader_counts)) {
    return null;
  }

  return {
    articleIds: data.article_ids,
    readerCounts: data.reader_counts,
    computedAt: data.computed_at,
  };
}

async function writeSnapshot(counts: ReaderCount[], now: Date): Promise<void> {
  const supabase = createServiceRoleClient();
  const readerCounts = Object.fromEntries(
    counts.map((count) => [count.articleId, count.readers]),
  );
  const { error } = await supabase.from("trending_snapshots").upsert({
    id: TRENDING_SNAPSHOT_ID,
    article_ids: counts.map((count) => count.articleId),
    reader_counts: readerCounts,
    computed_at: now.toISOString(),
  });

  if (error) {
    if (isMissingRelationError(error.message)) {
      console.warn(
        "[trending] trending_snapshots table missing — run npm run db:push",
      );
      return;
    }
    throw new Error(`write trending snapshot failed: ${error.message}`);
  }
}

let warnedMissingPosthogConfig = false;

export async function loadTrendingCounts(now = new Date()): Promise<ReaderCount[]> {
  const snapshot = await readSnapshot();
  if (!readPosthogQueryConfig()) {
    if (!warnedMissingPosthogConfig) {
      warnedMissingPosthogConfig = true;
      console.warn(
        "[trending] POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID is unset; serving the last snapshot",
      );
    }
    return snapshot ? countsFromSnapshot(snapshot) : [];
  }

  const resolved = await resolveTrendingCounts({
    now,
    snapshot,
    refresh: queryPosthogTrending,
  });

  if (resolved.refreshed) {
    await writeSnapshot(resolved.counts, now);
  }

  return resolved.counts;
}
