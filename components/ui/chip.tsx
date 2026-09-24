import { IconPlus } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  showPlus?: boolean;
  selected?: boolean;
  className?: string;
};

export function Chip({
  children,
  showPlus = false,
  selected = false,
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-sm",
        selected
          ? "border-text-primary bg-text-primary text-bg-primary"
          : "border-border bg-bg-secondary text-text-primary",
        className,
      )}
    >
      <span>{children}</span>
      {showPlus ? (
        <IconPlus
          size={14}
          className={selected ? "text-bg-primary/80" : "text-text-secondary"}
        />
      ) : null}
    </span>
  );
}
