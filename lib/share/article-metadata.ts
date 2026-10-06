import type { Metadata } from "next";

const TITLE_SUFFIX = " · truth-news";
const DESCRIPTION_MAX = 200;

export function articleShareDescription(
  summary: string | undefined,
  title: string,
): string {
  const text = (summary?.trim() || title).replace(/\s+/g, " ");
  if (text.length <= DESCRIPTION_MAX) {
    return text;
  }
  return `${text.slice(0, DESCRIPTION_MAX - 3).trimEnd()}...`;
}

function isAbsoluteHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function articlePageUrl(
  origin: string,
  id: string,
): string | undefined {
  if (!isAbsoluteHttpUrl(origin)) {
    return undefined;
  }
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${base}/news/${id}`;
}

export function articleShareMetadata(input: {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl?: string;
}): Metadata {
  const images = isAbsoluteHttpUrl(input.imageUrl)
    ? [{ url: input.imageUrl, alt: input.title }]
    : undefined;

  return {
    title: `${input.title}${TITLE_SUFFIX}`,
    description: input.description,
    openGraph: {
      title: input.title,
      description: input.description,
      type: "article",
      url: input.pageUrl,
      images,
    },
  };
}
