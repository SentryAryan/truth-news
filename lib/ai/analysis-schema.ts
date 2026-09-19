import { z } from "zod";

export const AnalysisOutputSchema = z
  .object({
    summary: z.string().min(1),
    sentiment_score: z.number().min(-1).max(1),
    sentiment_label: z.enum(["positive", "neutral", "negative"]),
    left_percentage: z.number().int().min(0).max(100),
    center_percentage: z.number().int().min(0).max(100),
    right_percentage: z.number().int().min(0).max(100),
    bias_label: z.enum(["left", "center", "right", "mixed", "unclear"]),
    confidence: z.number().min(0).max(1),
    framing_notes: z.array(z.string()),
    loaded_terms: z.array(z.string()),
    disclaimer: z.string(),
  })
  .refine(
    (value) =>
      value.left_percentage +
        value.center_percentage +
        value.right_percentage ===
      100,
    { message: "left_percentage + center_percentage + right_percentage must equal 100" },
  );

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

/** Server-derived bias score: (right − left) / 100 */
export function deriveBiasScore(
  leftPercentage: number,
  rightPercentage: number,
): number {
  return (rightPercentage - leftPercentage) / 100;
}
