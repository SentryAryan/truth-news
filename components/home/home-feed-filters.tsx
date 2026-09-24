"use client";

import { useHomeFeedNav } from "@/components/home/home-feed-nav";
import {
    LabeledSelect,
    SelectItem,
} from "@/components/ui/select";
import {
    HOME_BIAS_LABELS,
    HOME_PAGE_SIZES,
    HOME_SENTIMENT_LABELS,
    buildHomeFeedHref,
    type HomeFeedParams,
    type HomePageSize,
} from "@/lib/home-feed-params";
import type { HomeFilterSource } from "@/lib/supabase/queries/articles";
import type { BiasLabel, SentimentLabel } from "@/lib/supabase/types";
import posthog from "posthog-js";

const ALL_VALUE = "all";

type HomeFeedFiltersProps = {
  params: HomeFeedParams;
  sources: HomeFilterSource[];
  className?: string;
};

function labelBias(value: BiasLabel): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function labelSentiment(value: SentimentLabel): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function HomeFeedFilters({
  params,
  sources,
  className,
}: HomeFeedFiltersProps) {
  const { push } = useHomeFeedNav();

  function navigate(patch: Parameters<typeof buildHomeFeedHref>[1]) {
    push(buildHomeFeedHref(params, patch));
  }

  return (
    <div
      className={
        className ??
        "flex w-full flex-wrap items-end gap-2 sm:gap-3 lg:w-auto lg:justify-end"
      }
    >
      <LabeledSelect
        label="Bias"
        aria-label="Filter by bias"
        value={params.bias ?? ALL_VALUE}
        onValueChange={(value) => {
          if (
            process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
            process.env.NEXT_PUBLIC_POSTHOG_HOST
          ) {
            posthog.capture("feed_filter_changed", {
              filter: "bias",
              value,
            });
          }
          navigate({
            bias: value === ALL_VALUE ? null : (value as BiasLabel),
          });
        }}
      >
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {HOME_BIAS_LABELS.map((label) => (
          <SelectItem key={label} value={label}>
            {labelBias(label)}
          </SelectItem>
        ))}
      </LabeledSelect>

      <LabeledSelect
        label="Sentiment"
        aria-label="Filter by sentiment"
        value={params.sentiment ?? ALL_VALUE}
        onValueChange={(value) => {
          if (
            process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
            process.env.NEXT_PUBLIC_POSTHOG_HOST
          ) {
            posthog.capture("feed_filter_changed", {
              filter: "sentiment",
              value,
            });
          }
          navigate({
            sentiment: value === ALL_VALUE ? null : (value as SentimentLabel),
          });
        }}
      >
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {HOME_SENTIMENT_LABELS.map((label) => (
          <SelectItem key={label} value={label}>
            {labelSentiment(label)}
          </SelectItem>
        ))}
      </LabeledSelect>

      <LabeledSelect
        label="Source"
        aria-label="Filter by source"
        value={params.source ?? ALL_VALUE}
        onValueChange={(value) => {
          if (
            process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
            process.env.NEXT_PUBLIC_POSTHOG_HOST
          ) {
            posthog.capture("feed_filter_changed", {
              filter: "source",
              value,
            });
          }
          navigate({ source: value === ALL_VALUE ? null : value });
        }}
      >
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {sources.map((source) => (
          <SelectItem key={source.id} value={source.id}>
            {source.name}
          </SelectItem>
        ))}
      </LabeledSelect>

      <LabeledSelect
        label="Per page"
        aria-label="Articles per page"
        value={String(params.pageSize)}
        onValueChange={(value) => {
          const next = Number.parseInt(value, 10);
          if ((HOME_PAGE_SIZES as readonly number[]).includes(next)) {
            if (
              process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
              process.env.NEXT_PUBLIC_POSTHOG_HOST
            ) {
              posthog.capture("feed_filter_changed", {
                filter: "page_size",
                value: next,
              });
            }
            navigate({ pageSize: next as HomePageSize });
          }
        }}
      >
        {HOME_PAGE_SIZES.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size}
          </SelectItem>
        ))}
      </LabeledSelect>
    </div>
  );
}
