import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

/** Always use OpenRouter free-models router for analysis LLM calls. */
export const ANALYSIS_MODEL_ID = "openrouter/free";

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
