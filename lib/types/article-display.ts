export type BiasPercentages = {
  left: number;
  center: number;
  right: number;
};

export type ArticleCardVariant = "feed" | "inline";

export type HomeArticle = {
  id: string;
  title: string;
  category: string;
  location: string;
  imageUrl: string;
  imageAlt?: string;
  bias: BiasPercentages;
  sourceCount: number;
};

export type ArticleCardProps = {
  title: string;
  category: string;
  location: string;
  imageUrl: string;
  imageAlt?: string;
  bias: BiasPercentages;
  variant?: ArticleCardVariant;
  snippet?: string;
  timeAgo?: string;
  readTime?: string;
  sourceCount?: number;
  href?: string;
};

export type SourceBias = "left" | "center" | "right";

export type SourceEntry = {
  name: string;
  bias: SourceBias;
};

export type RelatedStory = {
  id: string;
  category: string;
  location: string;
  title: string;
  imageUrl: string;
  publishedDate: string;
  readTime: string;
};

export type OverallBiasLabel = "left" | "center" | "right" | "mixed" | "unclear";

export type DetailArticle = {
  id: string;
  category: string;
  location: string;
  title: string;
  author: string;
  publishedDate: string;
  readTime: string;
  imageUrl: string;
  imageCaption: string;
  bias: BiasPercentages;
  sources: number;
  body: string[];
  overallBiasLabel: OverallBiasLabel;
  overallBiasPercent: number;
  summary: string[];
  summaryDate: string;
  summaryReadTime: string;
  sourceList: SourceEntry[];
  relatedIds: string[];
};
