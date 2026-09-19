import "server-only";

import {
  AnalysisOutputSchema,
  type AnalysisOutput,
} from "@/lib/ai/analysis-schema";
import {
  ANALYSIS_MODEL_ID,
  getOpenRouterClient,
} from "@/lib/ai/openrouter";
import { generateObject } from "ai";

const MAX_TEXT_CHARS = 12_000;

const SYSTEM_PROMPT = `You are an impartial news analysis assistant for truth-news.
Analyze ONLY the provided article title and body text. Do not infer political framing from the outlet or source name.

Return a structured object with:
- summary: neutral 2–4 sentence summary of the article
- sentiment_score: number from -1 (negative) to 1 (positive)
- sentiment_label: positive | neutral | negative (must match the score)
- left_percentage, center_percentage, right_percentage: integers 0–100 that MUST sum to exactly 100 (AI-estimated political framing of how the article is written, not objective truth)
- bias_label: left | center | right | mixed | unclear — match the strongest percentage unless confidence is low or percentages are close; use unclear when evidence is weak
- confidence: 0–1
- framing_notes: array of 1–3 short notes on how the article frames the story (empty array if none)
- loaded_terms: array of politically charged words/phrases found in the text (empty array if none)
- disclaimer: short note that framing is AI-estimated and may not reflect editorial intent`;

async function callOnce(
  title: string,
  rawText: string,
): Promise<AnalysisOutput> {
  const openrouter = getOpenRouterClient();
  const truncated =
    rawText.length > MAX_TEXT_CHARS
      ? `${rawText.slice(0, MAX_TEXT_CHARS)}\n\n[truncated]`
      : rawText;

  const { object } = await generateObject({
    model: openrouter(ANALYSIS_MODEL_ID),
    schema: AnalysisOutputSchema,
    schemaName: "ArticleAnalysis",
    schemaDescription: "Structured news article analysis for truth-news",
    system: SYSTEM_PROMPT,
    prompt: `Title: ${title}\n\nArticle text:\n${truncated}`,
    temperature: 0,
  });

  return AnalysisOutputSchema.parse(object);
}

/**
 * Analyze one article via OpenRouter `openrouter/free`.
 * Retries once on failure; returns null if both attempts fail.
 */
export async function analyzeArticle(input: {
  id: string;
  title: string;
  raw_text: string;
}): Promise<AnalysisOutput | null> {
  try {
    return await callOnce(input.title, input.raw_text);
  } catch (firstError) {
    const firstMessage =
      firstError instanceof Error ? firstError.message : "analyze failed";
    console.warn(
      `[analyze] retry once for ${input.id}: ${firstMessage}`,
    );
    try {
      return await callOnce(input.title, input.raw_text);
    } catch (secondError) {
      const secondMessage =
        secondError instanceof Error ? secondError.message : "analyze failed";
      console.error(
        `[analyze] failed for ${input.id}: ${secondMessage}`,
      );
      return null;
    }
  }
}
