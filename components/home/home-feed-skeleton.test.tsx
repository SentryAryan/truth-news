import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
    HomeFeedCardsSkeleton,
    HomeFeedSkeleton,
} from "@/components/home/home-feed-skeleton";

describe("HomeFeedSkeleton", () => {
  it("exposes accessible busy status and card placeholders", () => {
    const html = renderToStaticMarkup(createElement(HomeFeedSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading articles"');
    expect(html).toContain("Loading articles");
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("aspect-[16/10]");
    expect(html).toContain('aria-label="Loading trending"');
    expect(html).toContain("snap-x");
  });
});

describe("HomeFeedCardsSkeleton", () => {
  it("renders a busy card grid for soft navigations", () => {
    const html = renderToStaticMarkup(
      createElement(HomeFeedCardsSkeleton, { count: 3 }),
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("aspect-[16/10]");
  });
});
