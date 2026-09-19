import { BiasBarRow } from "@/components/details/bias-bar-row";
import { IconInfo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
    BiasPercentages,
    OverallBiasLabel,
} from "@/lib/types/article-display";

type BiasAnalysisCardProps = {
  label: OverallBiasLabel;
  percent: number;
  sources: number;
  bias: BiasPercentages;
  sentimentLabel?: "positive" | "neutral" | "negative";
  confidence?: number;
};

function labelColor(label: OverallBiasLabel): string {
  switch (label) {
    case "left":
      return "text-bias-left";
    case "right":
      return "text-bias-right";
    case "center":
      return "text-text-primary";
    case "mixed":
    case "unclear":
      return "text-text-primary";
    default: {
      const _exhaustive: never = label;
      return _exhaustive;
    }
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function BiasAnalysisCard({
  label,
  percent,
  sources,
  bias,
  sentimentLabel,
  confidence,
}: BiasAnalysisCardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-primary p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-body-md font-semibold text-text-primary">
          Bias Analysis
        </h2>
        <IconInfo size={16} className="text-text-secondary" aria-hidden />
      </div>

      <div>
        <p className="text-body-sm text-text-secondary">
          Overall bias (AI-estimated)
        </p>
        <p className={cn("mt-1 text-h2 font-bold", labelColor(label))}>
          {capitalize(label)} {percent}%
        </p>
        <p className="mt-1 text-caption text-text-secondary">
          Based on {sources} balanced sources.
          {sentimentLabel ? ` · Sentiment: ${capitalize(sentimentLabel)}` : null}
          {typeof confidence === "number"
            ? ` · Confidence: ${Math.round(confidence * 100)}%`
            : null}
        </p>
      </div>

      <div className="border-t border-divider" />

      <div className="space-y-3">
        <BiasBarRow label="Left" percent={bias.left} tone="left" />
        <BiasBarRow label="Center" percent={bias.center} tone="center" />
        <BiasBarRow label="Right" percent={bias.right} tone="right" />
      </div>

      <p className="text-body-sm text-text-secondary leading-relaxed">
        Framing estimates are AI-assisted and based on article text evidence
        across sources — not an objective verdict on the outlet or topic.
      </p>

      <Button variant="secondary" className="w-full" type="button">
        How We Analyze Bias
      </Button>
    </div>
  );
}
