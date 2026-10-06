import { z } from "zod";

import type { ReaderCount } from "@/lib/trending/constants";
import { isArticleUuid } from "@/lib/trending/rank";

const responseSchema = z.object({
  results: z.array(
    z.tuple([z.string(), z.union([z.number(), z.string()])]),
  ),
});

export function parsePosthogTrendingResponse(payload: unknown): ReaderCount[] {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("PostHog trending query returned an unexpected shape");
  }

  return parsed.data.results.flatMap(([articleId, rawReaders]) => {
    const id = articleId.toLowerCase();
    const readers =
      typeof rawReaders === "number" ? rawReaders : Number(rawReaders);
    if (!isArticleUuid(id) || !Number.isFinite(readers) || readers < 1) {
      return [];
    }
    return [{ articleId: id, readers }];
  });
}
