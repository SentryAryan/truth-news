import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ComponentProps } from "react";

export function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row flex-wrap items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem({ className, ...props }: ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}

type PaginationLinkProps = ComponentProps<typeof Link> & {
  isActive?: boolean;
};

export function PaginationLink({
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2.5 text-body-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right",
        isActive
          ? "border-text-primary bg-text-primary text-bg-primary"
          : "border-border bg-bg-primary text-text-primary hover:bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      aria-label="Go to previous page"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-3 text-body-sm font-medium text-text-primary transition-colors hover:bg-surface",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationNext({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      aria-label="Go to next page"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-3 text-body-sm font-medium text-text-primary transition-colors hover:bg-surface",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center text-text-secondary",
        className,
      )}
      {...props}
    >
      …
    </span>
  );
}
