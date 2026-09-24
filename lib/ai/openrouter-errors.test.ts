import { describe, expect, it } from "vitest";

import {
    OpenRouterRateLimitError,
    isOpenRouterRateLimitError,
} from "@/lib/ai/openrouter-errors";

describe("isOpenRouterRateLimitError", () => {
  it("detects rate limit message text", () => {
    expect(
      isOpenRouterRateLimitError(
        new Error(
          "Failed after 3 attempts. Last error: AI_APICallError: Rate limit exceeded: free-models-per-day",
        ),
      ),
    ).toBe(true);
  });

  it("detects HTTP 429 statusCode", () => {
    expect(
      isOpenRouterRateLimitError({ statusCode: 429, message: "too many" }),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isOpenRouterRateLimitError(new Error("schema validation failed"))).toBe(
      false,
    );
  });

  it("OpenRouterRateLimitError is detectable", () => {
    expect(isOpenRouterRateLimitError(new OpenRouterRateLimitError())).toBe(
      true,
    );
  });
});
