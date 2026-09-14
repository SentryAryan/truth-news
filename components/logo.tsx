"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import Image from "next/image";

/** Black mark — light surfaces (navbar in light mode). */
const ICON_BLACK = "/icons/project/truth-news-favicon-black.png";
/** White mark — dark surfaces (navbar in dark mode; footer always). */
const ICON_WHITE = "/icons/project/truth-news-favicon-white.png";

type LogoProps = {
  tagline?: string;
  className?: string;
  /**
   * `default` — navbar: black in light mode, white in dark mode.
   * `onDark` — footer/chrome: always white (background stays dark).
   */
  tone?: "default" | "onDark";
  size?: "sm" | "md" | "responsive";
};

export function Logo({
  tagline,
  className,
  tone = "default",
  size = "md",
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const onDarkChrome = tone === "onDark";

  // Footer is always on dark chrome → white. Navbar follows resolved theme.
  const iconSrc =
    onDarkChrome || resolvedTheme === "dark" ? ICON_WHITE : ICON_BLACK;

  const titleClass =
    size === "sm"
      ? "text-body-lg"
      : size === "responsive"
        ? "text-body-lg sm:text-h2"
        : "text-h2";

  const iconBox =
    size === "sm"
      ? "h-6 w-6"
      : size === "responsive"
        ? "h-6 w-6 sm:h-8 sm:w-8"
        : "h-8 w-8";

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn("relative shrink-0 overflow-hidden rounded-sm", iconBox)}
        >
          <Image
            key={iconSrc}
            src={iconSrc}
            alt=""
            fill
            className="object-contain"
            sizes="32px"
            priority
          />
        </span>
        <span
          className={cn(
            "font-bold tracking-tight leading-none",
            titleClass,
            onDarkChrome ? "text-chrome-foreground" : "text-text-primary",
          )}
        >
          truth-news
        </span>
      </div>
      {tagline ? (
        <p
          className={cn(
            "text-body-sm mt-2 max-w-xs",
            onDarkChrome ? "text-chrome-muted" : "text-text-secondary",
          )}
        >
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
