/** Max characters of article body included in the embedding input. */
export const EMBED_TEXT_BODY_LIMIT = 8000;

export function buildEmbedText(title: string, rawText: string): string {
  return `${title}\n\n${rawText.slice(0, EMBED_TEXT_BODY_LIMIT)}`;
}

/**
 * True when analysis is missing or embedding is null/empty.
 * Used by pending detection and the analyze pipeline.
 * Accepts number[] or PostgREST/pgvector string forms via parseEmbedding.
 */
export function needsAnalysisOrEmbedding(
  analysis: { embedding?: unknown } | null | undefined,
): boolean {
  if (!analysis) {
    return true;
  }
  return parseEmbedding(analysis.embedding) === null;
}

/**
 * Normalize pgvector values from Supabase (number[], JSON array string, or
 * Postgres vector text like "[0.1,0.2]" / "0.1,0.2").
 */
export function parseEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const nums = value.filter((n): n is number => typeof n === "number");
    return nums.length === value.length && nums.length > 0 ? nums : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return parseEmbedding(parsed);
    } catch {
      // pgvector / PostgREST may return "[0.1,0.2,...]" already tried as JSON,
      // or bare "0.1,0.2,..." without brackets.
      const inner =
        trimmed.startsWith("[") && trimmed.endsWith("]")
          ? trimmed.slice(1, -1)
          : trimmed;
      const parts = inner.split(",").map((part) => part.trim());
      if (parts.length === 0 || parts.some((part) => part.length === 0)) {
        return null;
      }
      const nums = parts.map((part) => Number(part));
      if (nums.some((n) => !Number.isFinite(n))) {
        return null;
      }
      return nums.length > 0 ? nums : null;
    }
  }
  return null;
}
