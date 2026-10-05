import { describe, expect, it } from "vitest";

import { parseArticleId } from "@/lib/saved/article-id";

const VALID_ID = "3f1a2c4e-8b7d-4e6a-9c1d-2a4b6c8d0e1f";

describe("parseArticleId", () => {
  it("accepts a uuid", () => {
    expect(parseArticleId(VALID_ID)).toBe(VALID_ID);
  });

  it("accepts a uuid with surrounding spaces", () => {
    expect(parseArticleId(`  ${VALID_ID}  `)).toBe(VALID_ID);
  });

  it("rejects a non-uuid", () => {
    expect(parseArticleId("not-a-uuid")).toBeNull();
    expect(parseArticleId("")).toBeNull();
    expect(parseArticleId("1; drop table saved_articles")).toBeNull();
  });
});
