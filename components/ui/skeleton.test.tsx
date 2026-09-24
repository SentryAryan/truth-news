import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with default pulse and surface classes", () => {
    const html = renderToStaticMarkup(createElement(Skeleton));
    expect(html).toContain("animate-pulse");
    expect(html).toContain("bg-surface");
    expect(html).toContain("rounded-md");
    expect(html).toContain('aria-hidden="true"');
  });

  it("merges className", () => {
    const html = renderToStaticMarkup(
      createElement(Skeleton, { className: "h-4 w-20" }),
    );
    expect(html).toContain("h-4");
    expect(html).toContain("w-20");
  });
});
