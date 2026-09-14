import { cn } from "@/lib/cn";
import type { BiasPercentages } from "@/lib/types/article-display";

type BiasMeterProps = {
  left: number;
  center: number;
  right: number;
  className?: string;
};

function normalize(parts: BiasPercentages): BiasPercentages {
  const left = Math.max(0, parts.left);
  const center = Math.max(0, parts.center);
  const right = Math.max(0, parts.right);
  const total = left + center + right;

  if (total <= 0) {
    return { left: 0, center: 100, right: 0 };
  }

  if (Math.abs(total - 100) < 0.01) {
    return { left, center, right };
  }

  return {
    left: (left / total) * 100,
    center: (center / total) * 100,
    right: (right / total) * 100,
  };
}

function formatPct(value: number): number {
  return Math.round(value);
}

export function BiasMeter({ left, center, right, className }: BiasMeterProps) {
  const segments = normalize({ left, center, right });
  const leftPct = formatPct(segments.left);
  const centerPct = formatPct(segments.center);
  const rightPct = formatPct(segments.right);

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-sm text-caption font-medium",
        className,
      )}
      role="img"
      aria-label={`Bias distribution: Left ${leftPct}%, Center ${centerPct}%, Right ${rightPct}%`}
    >
      {segments.left > 0 ? (
        <div
          className="flex min-w-0 items-center justify-center bg-bias-left px-1 py-1.5 text-white"
          style={{ flexGrow: segments.left, flexBasis: 0 }}
        >
          <span className="truncate">L {leftPct}%</span>
        </div>
      ) : null}
      {segments.center > 0 ? (
        <div
          className="flex min-w-0 items-center justify-center bg-bias-center px-1 py-1.5 text-text-primary"
          style={{ flexGrow: segments.center, flexBasis: 0 }}
        >
          <span className="truncate">Center {centerPct}%</span>
        </div>
      ) : null}
      {segments.right > 0 ? (
        <div
          className="flex min-w-0 items-center justify-center bg-bias-right px-1 py-1.5 text-white"
          style={{ flexGrow: segments.right, flexBasis: 0 }}
        >
          <span className="truncate">Right {rightPct}%</span>
        </div>
      ) : null}
    </div>
  );
}
