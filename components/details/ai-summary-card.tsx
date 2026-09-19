import { IconInfo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

type AiSummaryCardProps = {
  summaryDate: string;
  summaryReadTime: string;
  summary: string[];
  disclaimer?: string;
  framingNotes?: string[];
  loadedTerms?: string[];
};

export function AiSummaryCard({
  summaryDate,
  summaryReadTime,
  summary,
  disclaimer,
  framingNotes = [],
  loadedTerms = [],
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
        Generated: {summaryDate}
        {summaryReadTime ? ` · ${summaryReadTime}` : null}
      </p>

      <ul className="list-disc space-y-3 pl-4 text-body-sm text-text-primary">
        {summary.map((point) => (
          <li key={point} className="leading-relaxed">
            {point}
          </li>
        ))}
      </ul>

      {framingNotes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-text-primary">
            Framing notes
          </p>
          <ul className="list-disc space-y-1.5 pl-4 text-body-sm text-text-secondary">
            {framingNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {loadedTerms.length > 0 ? (
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-text-primary">
            Loaded terms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {loadedTerms.map((term) => (
              <Chip key={term} className="px-2 py-0.5 text-caption">
                {term}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-caption text-text-secondary">
        {disclaimer?.trim() || "AI summaries can make mistakes."}
      </p>

      <Button variant="secondary" className="w-full" type="button">
        Provide Feedback
      </Button>
    </div>
  );
}
