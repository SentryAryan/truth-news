import type { BiasLabel, SentimentLabel } from "@/lib/supabase/types";

export const HOME_PAGE_SIZES = [10, 20, 50] as const;
export type HomePageSize = (typeof HOME_PAGE_SIZES)[number];

export const HOME_BIAS_LABELS = [
  "left",
  "center",
  "right",
  "mixed",
  "unclear",
] as const satisfies readonly BiasLabel[];

export const HOME_SENTIMENT_LABELS = [
  "positive",
  "neutral",
  "negative",
] as const satisfies readonly SentimentLabel[];

export type HomeFeedParams = {
  page: number;
  pageSize: HomePageSize;
  bias: BiasLabel | null;
  sentiment: SentimentLabel | null;
  source: string | null;
};

export type HomeFeedSearchParams = Record<
  string,
  string | string[] | undefined
>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE: HomePageSize = 20;

function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isHomePageSize(value: number): value is HomePageSize {
  return (HOME_PAGE_SIZES as readonly number[]).includes(value);
}

function isBiasLabel(value: string): value is BiasLabel {
  return (HOME_BIAS_LABELS as readonly string[]).includes(value);
}

function isSentimentLabel(value: string): value is SentimentLabel {
  return (HOME_SENTIMENT_LABELS as readonly string[]).includes(value);
}

export function parseHomeFeedParams(
  searchParams: HomeFeedSearchParams,
): HomeFeedParams {
  const pageRaw = Number.parseInt(firstValue(searchParams.page) ?? "", 10);
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_PAGE;

  const sizeRaw = Number.parseInt(firstValue(searchParams.pageSize) ?? "", 10);
  const pageSize = isHomePageSize(sizeRaw) ? sizeRaw : DEFAULT_PAGE_SIZE;

  const biasRaw = firstValue(searchParams.bias)?.trim() ?? "";
  const bias = biasRaw && isBiasLabel(biasRaw) ? biasRaw : null;

  const sentimentRaw = firstValue(searchParams.sentiment)?.trim() ?? "";
  const sentiment =
    sentimentRaw && isSentimentLabel(sentimentRaw) ? sentimentRaw : null;

  const sourceRaw = firstValue(searchParams.source)?.trim() ?? "";
  const source = sourceRaw.length > 0 ? sourceRaw : null;

  return { page, pageSize, bias, sentiment, source };
}

export type HomeFeedHrefPatch = {
  page?: number;
  pageSize?: HomePageSize;
  bias?: BiasLabel | null;
  sentiment?: SentimentLabel | null;
  source?: string | null;
};

/**
 * Build a homepage href from current params + a patch.
 * Changing filters or pageSize resets page to 1 unless `page` is explicitly set.
 */
export function buildHomeFeedHref(
  current: HomeFeedParams,
  patch: HomeFeedHrefPatch = {},
): string {
  const filterChanged =
    ("bias" in patch && patch.bias !== current.bias) ||
    ("sentiment" in patch && patch.sentiment !== current.sentiment) ||
    ("source" in patch && patch.source !== current.source) ||
    ("pageSize" in patch && patch.pageSize !== current.pageSize);

  const next: HomeFeedParams = {
    page:
      patch.page !== undefined
        ? Math.max(1, Math.floor(patch.page))
        : filterChanged
          ? 1
          : current.page,
    pageSize: patch.pageSize ?? current.pageSize,
    bias: "bias" in patch ? patch.bias ?? null : current.bias,
    sentiment:
      "sentiment" in patch ? patch.sentiment ?? null : current.sentiment,
    source: "source" in patch ? patch.source ?? null : current.source,
  };

  const params = new URLSearchParams();
  if (next.page !== DEFAULT_PAGE) {
    params.set("page", String(next.page));
  }
  if (next.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(next.pageSize));
  }
  if (next.bias) {
    params.set("bias", next.bias);
  }
  if (next.sentiment) {
    params.set("sentiment", next.sentiment);
  }
  if (next.source) {
    params.set("source", next.source);
  }

  const qs = params.toString();
  return qs.length > 0 ? `/?${qs}` : "/";
}

export function clampHomePage(page: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }
  return Math.min(Math.max(1, page), totalPages);
}
