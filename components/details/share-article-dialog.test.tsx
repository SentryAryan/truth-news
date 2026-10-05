import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShareArticleDialog } from "@/components/details/share-article-dialog";

describe("ShareArticleDialog", () => {
  it("renders a dialog with platform links for the article url", () => {
    const url = "https://truth-news.example/news/abc";
    const html = renderToStaticMarkup(
      createElement(ShareArticleDialog, {
        open: true,
        title: "Budget vote",
        url,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Share article");
    expect(html).toContain("Copy link");
    expect(html).toContain(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    );
    expect(html).toContain("noopener");
    expect(html).toContain("WhatsApp");
    expect(html).toContain("<svg");
    expect(html).toContain("mailto:?subject=");
  });

  it("renders nothing while closed", () => {
    const html = renderToStaticMarkup(
      createElement(ShareArticleDialog, {
        open: false,
        title: "Budget vote",
        url: "https://truth-news.example/news/abc",
        onClose: () => undefined,
      }),
    );

    expect(html).toBe("");
  });
});
