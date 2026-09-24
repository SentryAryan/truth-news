import type { RelatedStory } from "@/lib/types/article-display";

export type MatchRelatedArticleRow = {
  id: string;
  title: string;
  image_url: string;
  published_at: string;
  source_name: string;
};

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function mapMatchRowToRelatedStory(
  row: MatchRelatedArticleRow,
): RelatedStory {
  return {
    id: row.id,
    category: row.source_name,
    location: "",
    title: row.title,
    imageUrl: row.image_url,
    publishedDate: formatPublishedDate(row.published_at),
    readTime: "",
  };
}
