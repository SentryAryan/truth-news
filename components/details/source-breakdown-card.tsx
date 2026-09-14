import { BiasBarRow } from "@/components/details/bias-bar-row";
import { IconInfo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
    BiasPercentages,
    SourceBias,
    SourceEntry,
} from "@/lib/types/article-display";

type SourceBreakdownCardProps = {
  sources: number;
  bias: BiasPercentages;
  sourceList: SourceEntry[];
};

function countByBias(list: SourceEntry[], bias: SourceBias): number {
  return list.filter((entry) => entry.bias === bias).length;
}

function chipClass(bias: SourceBias): string {
  switch (bias) {
    case "left":
      return "bg-bias-left/10 text-bias-left";
    case "right":
      return "bg-bias-right/10 text-bias-right";
    case "center":
      return "border border-border bg-surface text-text-secondary";
    default: {
      const _exhaustive: never = bias;
      return _exhaustive;
    }
  }
}

function formatBias(bias: SourceBias): string {
  return bias.charAt(0).toUpperCase() + bias.slice(1);
}

export function SourceBreakdownCard({
  sources,
  bias,
  sourceList,
}: SourceBreakdownCardProps) {
  const leftCount = countByBias(sourceList, "left");
  const centerCount = countByBias(sourceList, "center");
  const rightCount = countByBias(sourceList, "right");

  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-primary p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-body-md font-semibold text-text-primary">
          Source Breakdown
        </h2>
        <IconInfo size={16} className="text-text-secondary" aria-hidden />
      </div>

      <p className="text-body-sm text-text-secondary">
        {sources} Total Sources
      </p>

      <div className="space-y-3">
        <BiasBarRow
          label="Left"
          percent={bias.left}
          tone="left"
          valueLabel={`${leftCount} (${Math.round(bias.left)}%)`}
        />
        <BiasBarRow
          label="Center"
          percent={bias.center}
          tone="center"
          valueLabel={`${centerCount} (${Math.round(bias.center)}%)`}
        />
        <BiasBarRow
          label="Right"
          percent={bias.right}
          tone="right"
          valueLabel={`${rightCount} (${Math.round(bias.right)}%)`}
        />
      </div>

      <div className="border-t border-divider" />

      <div>
        <div className="mb-3 flex items-center justify-between text-body-sm font-medium text-text-primary">
          <span>Top Sources</span>
          <span className="text-text-secondary font-normal">Bias</span>
        </div>
        <ul className="space-y-2.5">
          {sourceList.map((entry) => (
            <li
              key={entry.name}
              className="flex items-center justify-between gap-3"
            >
              <span className="min-w-0 truncate text-body-sm text-text-primary">
                {entry.name}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-caption font-medium",
                  chipClass(entry.bias),
                )}
              >
                {formatBias(entry.bias)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button variant="secondary" className="w-full" type="button">
        View All Sources
      </Button>
    </div>
  );
}
