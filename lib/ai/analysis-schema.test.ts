import {
    AnalysisOutputSchema,
    deriveBiasScore,
} from "@/lib/ai/analysis-schema";
import { describe, expect, it } from "vitest";

describe("deriveBiasScore", () => {
  it("computes (right - left) / 100", () => {
    expect(deriveBiasScore(20, 50)).toBeCloseTo(0.3);
    expect(deriveBiasScore(40, 40)).toBe(0);
    expect(deriveBiasScore(60, 10)).toBeCloseTo(-0.5);
  });
});

describe("AnalysisOutputSchema", () => {
  const valid = {
    summary: "A neutral summary of the story.",
    sentiment_score: 0.1,
    sentiment_label: "neutral" as const,
    left_percentage: 30,
    center_percentage: 40,
    right_percentage: 30,
    bias_label: "center" as const,
    confidence: 0.7,
    framing_notes: ["Emphasizes institutional process."],
    loaded_terms: ["crisis"],
    disclaimer: "AI-estimated framing only.",
  };

  it("accepts valid output with percentages summing to 100", () => {
    expect(AnalysisOutputSchema.parse(valid)).toMatchObject(valid);
  });

  it("rejects percentages that do not sum to 100", () => {
    expect(() =>
      AnalysisOutputSchema.parse({
        ...valid,
        left_percentage: 50,
        center_percentage: 50,
        right_percentage: 50,
      }),
    ).toThrow();
  });

  it("rejects invalid bias labels", () => {
    expect(() =>
      AnalysisOutputSchema.parse({
        ...valid,
        bias_label: "center-left",
      }),
    ).toThrow();
  });
});
