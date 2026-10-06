import { describe, expect, it } from "vitest";

import { parsePosthogTrendingResponse } from "@/lib/trending/posthog-response";

describe("parsePosthogTrendingResponse", () => {
  it("keeps uuid rows and drops everything else", () => {
    const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(
      parsePosthogTrendingResponse({
        results: [
          [id, "4"],
          ["/news/not-id", 9],
          [id.toUpperCase(), 2],
          ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", 0],
        ],
      }),
    ).toEqual([
      { articleId: id, readers: 4 },
      { articleId: id, readers: 2 },
    ]);
  });

  it("rejects an unexpected payload", () => {
    expect(() => parsePosthogTrendingResponse({ results: "nope" })).toThrow(
      /unexpected shape/,
    );
  });
});
