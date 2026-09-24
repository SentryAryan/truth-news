"use client";

import { useHomeFeedNav } from "@/components/home/home-feed-nav";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
} from "@/components/ui/pagination";
import { cn } from "@/lib/cn";
import {
    buildHomeFeedHref,
    type HomeFeedParams,
} from "@/lib/home-feed-params";
import type { ReactNode } from "react";
import posthog from "posthog-js";

function visiblePages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < total - 1) {
    pages.push("ellipsis");
  }
  pages.push(total);
  return pages;
}

type HomePaginationProps = {
  params: HomeFeedParams;
  totalPages: number;
  className?: string;
};

function NavButton({
  href,
  children,
  className,
  disabled,
  targetPage,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: {
  href: string | null;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  targetPage: number;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
}) {
  const { push } = useHomeFeedNav();

  if (disabled || !href) {
    return (
      <span
        aria-disabled
        className={cn(
          "inline-flex h-10 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-border px-3 text-body-sm text-text-secondary opacity-50",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onClick={() => {
        if (
          process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
          process.env.NEXT_PUBLIC_POSTHOG_HOST
        ) {
          posthog.capture("feed_page_changed", { target_page: targetPage });
        }
        push(href);
      }}
      className={cn(
        "inline-flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-md border px-2.5 text-body-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right",
        ariaCurrent === "page"
          ? "border-text-primary bg-text-primary text-bg-primary"
          : "border-border bg-bg-primary text-text-primary hover:bg-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function HomePagination({
  params,
  totalPages,
  className,
}: HomePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const page = Math.min(params.page, totalPages);
  const prevHref =
    page > 1 ? buildHomeFeedHref(params, { page: page - 1 }) : null;
  const nextHref =
    page < totalPages ? buildHomeFeedHref(params, { page: page + 1 }) : null;

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <NavButton
            href={prevHref}
            disabled={!prevHref}
            targetPage={page - 1}
            aria-label="Go to previous page"
            className="gap-1 px-3"
          >
            <IconChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </NavButton>
        </PaginationItem>

        {visiblePages(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`e-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <NavButton
                href={buildHomeFeedHref(params, { page: item })}
                targetPage={item}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </NavButton>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <NavButton
            href={nextHref}
            disabled={!nextHref}
            targetPage={page + 1}
            aria-label="Go to next page"
            className="gap-1 px-3"
          >
            <span className="hidden sm:inline">Next</span>
            <IconChevronRight size={16} />
          </NavButton>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
