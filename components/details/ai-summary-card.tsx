import { IconInfo } from "@/components/icons";
import { Button } from "@/components/ui/button";

type AiSummaryCardProps = {
  summaryDate: string;
  summaryReadTime: string;
  summary: string[];
};

export function AiSummaryCard({
  summaryDate,
  summaryReadTime,
  summary,
}: AiSummaryCardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-primary p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-body-md font-semibold text-text-primary">
          AI Summary
        </h2>
        <IconInfo size={16} className="text-text-secondary" aria-hidden />
      </div>

      <p className="text-caption text-text-secondary">
        Generated: {summaryDate} · {summaryReadTime}
      </p>

      <ul className="list-disc space-y-3 pl-4 text-body-sm text-text-primary">
        {summary.map((point) => (
          <li key={point} className="leading-relaxed">
            {point}
          </li>
        ))}
      </ul>

      <p className="text-caption text-text-secondary">
        AI summaries can make mistakes.
      </p>

      <Button variant="secondary" className="w-full" type="button">
        Provide Feedback
      </Button>
    </div>
  );
}
