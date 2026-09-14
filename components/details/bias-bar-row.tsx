import { cn } from "@/lib/cn";

type BiasBarRowProps = {
  label: string;
  percent: number;
  tone: "left" | "center" | "right";
  valueLabel?: string;
  className?: string;
};

const barTone: Record<BiasBarRowProps["tone"], string> = {
  left: "bg-bias-left",
  center: "bg-bias-center",
  right: "bg-bias-right",
};

export function BiasBarRow({
  label,
  percent,
  tone,
  valueLabel,
  className,
}: BiasBarRowProps) {
  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-12 shrink-0 text-body-sm text-text-secondary">
        {label}
      </span>
      <div
        role="meter"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} bias: ${Math.round(percent)}%`}
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-secondary"
      >
        <div
          aria-hidden="true"
          className={cn("h-full rounded-full", barTone[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="min-w-14 shrink-0 text-right text-body-sm font-medium text-text-primary tabular-nums">
        {valueLabel ?? `${Math.round(percent)}%`}
      </span>
    </div>
  );
}
