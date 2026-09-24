import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { NewsDetailSkeleton } from "@/components/details/news-detail-skeleton";

describe("NewsDetailSkeleton", () => {
  it("exposes accessible busy status and details layout cues", () => {
    const html = renderToStaticMarkup(createElement(NewsDetailSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading article"');
    expect(html).toContain("Loading article");
    expect(html).toContain("aspect-video");
    expect(html).toContain("lg:grid");
    expect(html).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]");
    expect(html).toContain("sm:grid-cols-2");
  });
});
