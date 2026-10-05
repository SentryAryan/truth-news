import { describe, expect, it } from "vitest";

import { buildShareTargets } from "@/lib/share/platforms";

const url = "https://truth-news.example/news/3f1a2c4e-8b7d-4e6a-9c1d-2a4b6c8d0e1f";
const title = "Council vote & budget";

describe("buildShareTargets", () => {
  const targets = buildShareTargets({ url, title });
  const byId = Object.fromEntries(targets.map((target) => [target.id, target.href]));

  it("includes every platform", () => {
    expect(targets.map((target) => target.id)).toEqual([
      "x",
      "facebook",
      "linkedin",
      "whatsapp",
      "reddit",
      "telegram",
      "email",
    ]);
  });

  it("encodes the article url and title into each intent", () => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    expect(byId.x).toBe(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    );
    expect(byId.facebook).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    );
    expect(byId.linkedin).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    );
    expect(byId.whatsapp).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    );
    expect(byId.reddit).toBe(
      `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    );
    expect(byId.telegram).toBe(
      `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    );
    expect(byId.email).toBe(
      `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${title}\n\n${url}`)}`,
    );
  });
});
