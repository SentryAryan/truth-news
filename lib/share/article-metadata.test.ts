import { describe, expect, it } from "vitest";

import {
    articlePageUrl,
    articleShareDescription,
    articleShareMetadata,
} from "@/lib/share/article-metadata";

describe("articleShareMetadata", () => {
  it("publishes title, description, and image for unsigned crawlers", () => {
    const metadata = articleShareMetadata({
      title: "Council vote & budget",
      description: "A neutral summary of the vote.",
      imageUrl: "https://cdn.example/story.jpg",
      pageUrl: "https://truth-news.example/news/article-1",
    });

    expect(metadata.title).toBe("Council vote & budget · truth-news");
    expect(metadata.description).toBe("A neutral summary of the vote.");
    expect(metadata.openGraph).toMatchObject({
      title: "Council vote & budget",
      description: "A neutral summary of the vote.",
      type: "article",
      url: "https://truth-news.example/news/article-1",
      images: [{ url: "https://cdn.example/story.jpg", alt: "Council vote & budget" }],
    });
  });

  it("omits an image that is not an absolute http URL", () => {
    const metadata = articleShareMetadata({
      title: "Story",
      description: "Story",
      imageUrl: "/local/story.jpg",
      pageUrl: "https://truth-news.example/news/article-1",
    });

    expect(metadata.openGraph?.images).toBeUndefined();
  });
});

describe("articleShareDescription", () => {
  it("falls back to the title when the summary is blank", () => {
    expect(articleShareDescription("  ", "Headline")).toBe("Headline");
  });

  it("caps a long summary", () => {
    const summary = "word ".repeat(80);
    const description = articleShareDescription(summary, "Headline");
    expect(description.length).toBeLessThanOrEqual(200);
    expect(description.endsWith("...")).toBe(true);
  });
});

describe("articlePageUrl", () => {
  it("builds the article URL from the request origin", () => {
    expect(articlePageUrl("https://truth-news.example/", "article-1")).toBe(
      "https://truth-news.example/news/article-1",
    );
  });

  it("returns undefined when the origin is not absolute", () => {
    expect(articlePageUrl("", "article-1")).toBeUndefined();
  });
});
