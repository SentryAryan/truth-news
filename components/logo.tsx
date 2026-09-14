import { cn } from "@/lib/cn";

type LogoProps = {
  tagline?: string;
  className?: string;
  tone?: "default" | "onDark";
  /** Compact for dense chrome (e.g. mobile header). Default scales up at `sm`. */
  size?: "sm" | "md" | "responsive";
};

export function Logo({
  tagline,
  className,
  tone = "default",
  size = "md",
}: LogoProps) {
  const onDark = tone === "onDark";

  const titleClass =
    size === "sm"
      ? "text-body-lg"
      : size === "responsive"
        ? "text-body-lg sm:text-h2"
        : "text-h2";

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <span
        className={cn(
          "font-bold tracking-tight leading-none",
          titleClass,
          onDark ? "text-chrome-foreground" : "text-text-primary",
        )}
      >
        truth-news
      </span>
      {tagline ? (
        <p
          className={cn(
            "text-body-sm mt-2 max-w-xs",
            onDark ? "text-chrome-muted" : "text-text-secondary",
          )}
        >
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
