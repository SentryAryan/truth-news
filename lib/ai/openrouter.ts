import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

/** Always use OpenRouter free-models router for analysis LLM calls. */
export const ANALYSIS_MODEL_ID = "openrouter/free";

/**
 * Default free embedding model via OpenRouter `/embeddings`.
 * Not `openrouter/free` (chat router only). Override with EMBEDDING_MODEL_ID.
 */
export const DEFAULT_EMBEDDING_MODEL_ID = "nvidia/nemotron-3-embed-1b:free";

/** Native output size for nvidia/nemotron-3-embed-1b (must match pgvector column). */
export const EMBEDDING_DIMENSIONS = 2048;

export function getEmbeddingModelId(): string {
  const fromEnv = process.env.EMBEDDING_MODEL_ID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_EMBEDDING_MODEL_ID;
}

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
