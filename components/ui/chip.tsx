import { IconPlus } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  showPlus?: boolean;
  className?: string;
};

export function Chip({ children, showPlus = false, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-body-sm text-text-primary",
        className,
      )}
    >
      <span>{children}</span>
      {showPlus ? <IconPlus size={14} className="text-text-secondary" /> : null}
    </span>
  );
}
