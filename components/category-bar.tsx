"use client";

import { useHomeFeedNav } from "@/components/home/home-feed-nav";
import { IconChevronRight } from "@/components/icons";
import { Chip } from "@/components/ui/chip";
import {
    buildHomeFeedHref,
    type HomeFeedParams,
} from "@/lib/home-feed-params";
import type { HomeFilterSource } from "@/lib/supabase/queries/articles";
import posthog from "posthog-js";

type CategoryBarProps = {
  sources: HomeFilterSource[];
  params: HomeFeedParams;
};

export function CategoryBar({ sources, params }: CategoryBarProps) {
  const { push } = useHomeFeedNav();
  const selectedSource = params.source;

  return (
    <div className="border-b border-border bg-bg-primary">
      <div className="mx-auto flex w-full max-w-[var(--container-truth-news)] items-center gap-1.5 px-4 py-2.5 sm:gap-2 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              if (
                process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
                process.env.NEXT_PUBLIC_POSTHOG_HOST
              ) {
                posthog.capture("feed_source_filter_changed", {
                  source_id: null,
                });
              }
              push(buildHomeFeedHref(params, { source: null }));
            }}
            className="shrink-0 cursor-pointer border-0 bg-transparent p-0"
            aria-current={selectedSource === null ? "page" : undefined}
          >
            <Chip selected={selectedSource === null} className="whitespace-nowrap">
              All
            </Chip>
          </button>

          {sources.map((source) => {
            const selected = selectedSource === source.id;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => {
                  if (
                    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
                    process.env.NEXT_PUBLIC_POSTHOG_HOST
                  ) {
                    posthog.capture("feed_source_filter_changed", {
                      source_id: source.id,
                    });
                  }
                  push(buildHomeFeedHref(params, { source: source.id }));
                }}
                className="shrink-0 cursor-pointer border-0 bg-transparent p-0"
                aria-current={selected ? "page" : undefined}
              >
                <Chip selected={selected} className="whitespace-nowrap">
                  {source.name}
                </Chip>
              </button>
            );
          })}
        </div>

        <span
          aria-hidden
          className="hidden h-8 w-8 shrink-0 items-center justify-center text-text-secondary sm:inline-flex"
        >
          <IconChevronRight size={18} />
        </span>
      </div>
    </div>
  );
}
