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
