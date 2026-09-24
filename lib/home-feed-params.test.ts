import {
  buildHomeFeedHref,
  clampHomePage,
  parseHomeFeedParams,
  type HomeFeedParams,
} from "@/lib/home-feed-params";
import { describe, expect, it } from "vitest";

const base: HomeFeedParams = {
  page: 2,
  pageSize: 20,
  bias: null,
  sentiment: null,
  source: null,
};

describe("parseHomeFeedParams", () => {
  it("applies defaults", () => {
    expect(parseHomeFeedParams({})).toEqual({
      page: 1,
      pageSize: 20,
      bias: null,
      sentiment: null,
      source: null,
    });
  });

  it("parses valid params", () => {
    expect(
      parseHomeFeedParams({
        page: "3",
        pageSize: "50",
        bias: "left",
        sentiment: "negative",
        source: "abc-uuid",
      }),
    ).toEqual({
      page: 3,
      pageSize: 50,
      bias: "left",
      sentiment: "negative",
      source: "abc-uuid",
    });
  });

  it("ignores invalid enums and page sizes", () => {
    expect(
      parseHomeFeedParams({
        page: "0",
        pageSize: "15",
        bias: "far-left",
        sentiment: "meh",
      }),
    ).toEqual({
      page: 1,
      pageSize: 20,
      bias: null,
      sentiment: null,
      source: null,
    });
  });
});

describe("buildHomeFeedHref", () => {
  it("omits defaults from the query string", () => {
    expect(buildHomeFeedHref(base, { page: 1 })).toBe("/");
  });

  it("resets page when filters change", () => {
    expect(buildHomeFeedHref(base, { bias: "center" })).toBe("/?bias=center");
  });

  it("resets page when pageSize changes", () => {
    expect(buildHomeFeedHref(base, { pageSize: 10 })).toBe("/?pageSize=10");
  });

  it("preserves other params when changing page", () => {
    const current: HomeFeedParams = {
      page: 1,
      pageSize: 10,
      bias: "left",
      sentiment: "neutral",
      source: "src-1",
    };
    expect(buildHomeFeedHref(current, { page: 2 })).toBe(
      "/?page=2&pageSize=10&bias=left&sentiment=neutral&source=src-1",
    );
  });

  it("clears source when set to null", () => {
    const current: HomeFeedParams = {
      ...base,
      page: 1,
      source: "src-1",
    };
    expect(buildHomeFeedHref(current, { source: null })).toBe("/");
  });
});

describe("clampHomePage", () => {
  it("clamps within bounds", () => {
    expect(clampHomePage(0, 5)).toBe(1);
    expect(clampHomePage(9, 5)).toBe(5);
    expect(clampHomePage(3, 5)).toBe(3);
    expect(clampHomePage(2, 0)).toBe(1);
  });
});
