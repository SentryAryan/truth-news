import { mapMatchRowToRelatedStory } from "@/lib/supabase/related-articles";
import { describe, expect, it } from "vitest";

describe("mapMatchRowToRelatedStory", () => {
  it("maps RPC row fields onto RelatedStory", () => {
    const story = mapMatchRowToRelatedStory({
      id: "abc",
      title: "Example headline",
      image_url: "https://example.com/img.jpg",
      published_at: "2026-03-15T12:00:00.000Z",
      source_name: "Reuters",
    });

    expect(story).toEqual({
      id: "abc",
      category: "Reuters",
      location: "",
      title: "Example headline",
      imageUrl: "https://example.com/img.jpg",
      publishedDate: expect.stringMatching(/Mar/),
      readTime: "",
    });
  });
});
