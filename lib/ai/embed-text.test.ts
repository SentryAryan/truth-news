import {
    buildEmbedText,
    EMBED_TEXT_BODY_LIMIT,
    needsAnalysisOrEmbedding,
    parseEmbedding,
} from "@/lib/ai/embed-text";
import { describe, expect, it } from "vitest";

describe("buildEmbedText", () => {
  it("joins title and body with a blank line", () => {
    expect(buildEmbedText("Hello", "World")).toBe("Hello\n\nWorld");
  });

  it("truncates body to EMBED_TEXT_BODY_LIMIT", () => {
    const body = "a".repeat(EMBED_TEXT_BODY_LIMIT + 50);
    const result = buildEmbedText("T", body);
    expect(result).toBe(`T\n\n${"a".repeat(EMBED_TEXT_BODY_LIMIT)}`);
    expect(result.length).toBe("T\n\n".length + EMBED_TEXT_BODY_LIMIT);
  });
});

describe("needsAnalysisOrEmbedding", () => {
  it("is pending when analysis is missing", () => {
    expect(needsAnalysisOrEmbedding(null)).toBe(true);
    expect(needsAnalysisOrEmbedding(undefined)).toBe(true);
  });

  it("is pending when embedding is null or empty", () => {
    expect(needsAnalysisOrEmbedding({ embedding: null })).toBe(true);
    expect(needsAnalysisOrEmbedding({ embedding: [] })).toBe(true);
  });

  it("is not pending when embedding has values", () => {
    expect(needsAnalysisOrEmbedding({ embedding: [0.1, 0.2] })).toBe(false);
  });

  it("is not pending when embedding is a pgvector string", () => {
    expect(needsAnalysisOrEmbedding({ embedding: "[0.1,0.2,0.3]" })).toBe(
      false,
    );
  });
});

describe("parseEmbedding", () => {
  it("returns number arrays as-is", () => {
    expect(parseEmbedding([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("parses JSON string vectors", () => {
    expect(parseEmbedding("[0.1,0.2]")).toEqual([0.1, 0.2]);
  });

  it("parses comma-separated vector text", () => {
    expect(parseEmbedding("0.1, 0.2, 0.3")).toEqual([0.1, 0.2, 0.3]);
  });

  it("returns null for invalid values", () => {
    expect(parseEmbedding(null)).toBeNull();
    expect(parseEmbedding("not-json")).toBeNull();
    expect(parseEmbedding([1, "x"])).toBeNull();
    expect(parseEmbedding([])).toBeNull();
  });
});
