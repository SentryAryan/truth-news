import {
    isArticleUrl,
    splitIntoParagraphs,
    validateParsedArticle,
    type ParsedArticle,
} from "@/lib/pipeline/parse";
import { describe, expect, it } from "vitest";

describe("isArticleUrl", () => {
  it("accepts Reuters article slug with id", () => {
    expect(
      isArticleUrl(
        "https://www.reuters.com/world/europe/some-story-idABC1234567/",
        "reuters.com",
      ),
    ).toBe(true);
  });

  it("rejects Reuters category pages", () => {
    expect(
      isArticleUrl("https://www.reuters.com/world/africa", "reuters.com"),
    ).toBe(false);
    expect(
      isArticleUrl("https://www.reuters.com/markets", "reuters.com"),
    ).toBe(false);
  });

  it("accepts BBC news article paths", () => {
    expect(
      isArticleUrl(
        "https://www.bbc.com/news/articles/c1234567890a",
        "bbc.com",
      ),
    ).toBe(true);
    expect(
      isArticleUrl(
        "https://www.bbc.com/news/world-europe-12345678",
        "bbc.com",
      ),
    ).toBe(true);
  });

  it("rejects BBC section and live pages", () => {
    expect(isArticleUrl("https://www.bbc.com/news/world", "bbc.com")).toBe(
      false,
    );
    expect(isArticleUrl("https://www.bbc.com/sport/football", "bbc.com")).toBe(
      false,
    );
    expect(isArticleUrl("https://www.bbc.com/news/live/123", "bbc.com")).toBe(
      false,
    );
  });

  it("accepts Guardian dated story paths", () => {
    expect(
      isArticleUrl(
        "https://www.theguardian.com/world/2025/jan/15/long-story-slug-here",
        "theguardian.com",
      ),
    ).toBe(true);
  });

  it("rejects Guardian short section paths", () => {
    expect(
      isArticleUrl(
        "https://www.theguardian.com/us/environment",
        "theguardian.com",
      ),
    ).toBe(false);
  });

  it("accepts Fox dated article paths", () => {
    expect(
      isArticleUrl(
        "https://www.foxnews.com/politics/2025/01/15/some-story-slug",
        "foxnews.com",
      ),
    ).toBe(true);
  });

  it("rejects Fox shows and live", () => {
    expect(
      isArticleUrl("https://www.foxnews.com/shows/the-five", "foxnews.com"),
    ).toBe(false);
    expect(
      isArticleUrl("https://www.foxnews.com/live-news", "foxnews.com"),
    ).toBe(false);
  });

  it("accepts NPR dated story paths", () => {
    expect(
      isArticleUrl(
        "https://www.npr.org/2025/01/15/1234567890/story-slug",
        "npr.org",
      ),
    ).toBe(true);
  });

  it("rejects NPR sections", () => {
    expect(
      isArticleUrl("https://www.npr.org/sections/politics", "npr.org"),
    ).toBe(false);
  });
});

describe("validateParsedArticle", () => {
  const base: ParsedArticle = {
    originalUrl:
      "https://www.reuters.com/world/europe/valid-story-idABCDEF1234",
    canonicalUrl:
      "https://www.reuters.com/world/europe/valid-story-idABCDEF1234",
    title: "European leaders meet on trade talks",
    imageUrl: "https://cdn.example.com/image.jpg",
    publishedAt: "2025-01-15T12:00:00.000Z",
    rawText: [
      "First paragraph with enough characters to pass the gate.",
      "Second paragraph with enough characters to pass the gate.",
      "Third paragraph with enough characters to pass the gate.",
    ].join("\n\n"),
  };

  it("accepts a complete article", () => {
    expect(validateParsedArticle(base, base.originalUrl)).toEqual({
      valid: true,
    });
  });

  it("rejects missing published_at", () => {
    expect(
      validateParsedArticle({ ...base, publishedAt: "" }, base.originalUrl),
    ).toEqual({ valid: false, reason: "missing_published_at" });
  });

  it("rejects missing image", () => {
    expect(
      validateParsedArticle({ ...base, imageUrl: "" }, base.originalUrl),
    ).toEqual({ valid: false, reason: "missing_image_url" });
  });

  it("rejects generic title", () => {
    expect(
      validateParsedArticle({ ...base, title: "World" }, base.originalUrl),
    ).toEqual({ valid: false, reason: "generic_title" });
  });

  it("rejects weak body", () => {
    expect(
      validateParsedArticle(
        { ...base, rawText: "Too short." },
        base.originalUrl,
      ),
    ).toEqual({ valid: false, reason: "body_quality" });
  });
});

describe("splitIntoParagraphs", () => {
  it("splits a single large paragraph into chunks", () => {
    const text =
      "Sentence one here. Sentence two here. Sentence three here. Sentence four here. Sentence five here. Sentence six here.";
    const parts = splitIntoParagraphs(text);
    expect(parts.length).toBeGreaterThan(1);
  });
});
