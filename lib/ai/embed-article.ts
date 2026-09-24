import "server-only";

import { embed } from "ai";

import { buildEmbedText } from "@/lib/ai/embed-text";
import {
    EMBEDDING_DIMENSIONS,
    getEmbeddingModelId,
    getOpenRouterClient,
} from "@/lib/ai/openrouter";
import {
    isOpenRouterRateLimitError,
} from "@/lib/ai/openrouter-errors";

export {
    buildEmbedText,
    needsAnalysisOrEmbedding,
    parseEmbedding
} from "@/lib/ai/embed-text";

/** Single HTTP attempt — rate limits must not burn SDK retries. */
const AI_MAX_RETRIES = 0;

export type EmbedArticleResult =
  | { ok: true; embedding: number[] }
  | { ok: false; rateLimited: true; message: string }
  | { ok: false; rateLimited: false; message: string };

/**
 * Generate a 2048-dim embedding via OpenRouter (Nemotron free by default).
 * Does not retry rate limits; caller aborts the run.
 */
export async function embedArticle(
  title: string,
  rawText: string,
): Promise<EmbedArticleResult> {
  const value = buildEmbedText(title, rawText);
  try {
    const client = getOpenRouterClient();
    const modelId = getEmbeddingModelId();
    const { embedding } = await embed({
      model: client.embedding(modelId),
      value,
      maxRetries: AI_MAX_RETRIES,
      telemetry: {
        functionId: "article-embedding",
        recordInputs: true,
        recordOutputs: true,
      },
    });
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return {
        ok: false,
        rateLimited: false,
        message: "empty embedding",
      };
    }
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      const message = `unexpected dimensions: got ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}`;
      console.error(`[embed] ${message}`);
      return { ok: false, rateLimited: false, message };
    }
    return { ok: true, embedding };
  } catch (err) {
    const message = err instanceof Error ? err.message : "embed failed";
    if (isOpenRouterRateLimitError(err)) {
      console.error(`[embed] rate limited: ${message}`);
      return { ok: false, rateLimited: true, message };
    }
    console.error(`[embed] failed: ${message}`);
    return { ok: false, rateLimited: false, message };
  }
}
