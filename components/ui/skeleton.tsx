import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Decorative loading placeholder. Use semantic surface tokens so light/dark stay aligned.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface", className)}
      {...props}
    />
  );
}
