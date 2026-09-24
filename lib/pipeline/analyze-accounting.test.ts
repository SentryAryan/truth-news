import { describe, expect, it } from "vitest";

import { skippedAfterRateLimitAbort } from "@/lib/pipeline/analyze-accounting";

describe("skippedAfterRateLimitAbort", () => {
  it("counts remaining batch items when first article aborts", () => {
    expect(skippedAfterRateLimitAbort(5, 0)).toBe(4);
  });

  it("counts remaining when abort is mid-batch", () => {
    expect(skippedAfterRateLimitAbort(5, 2)).toBe(2);
  });

  it("returns 0 when abort is on the last article", () => {
    expect(skippedAfterRateLimitAbort(5, 4)).toBe(0);
  });
});
