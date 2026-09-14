import { BiasMeter } from "@/components/bias-meter";
import { IconBookmark, IconClock, IconInfo } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { ArticleCardProps } from "@/lib/types/article-display";
import Image from "next/image";

export function ArticleCard({
  title,
  category,
  location,
  imageUrl,
  imageAlt,
  bias,
  variant = "inline",
  snippet,
  timeAgo,
  readTime,
  sourceCount,
  href,
}: ArticleCardProps) {
  const content =
    variant === "feed" ? (
      <article
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-bg-primary shadow-sm",
          href ? "transition-shadow hover:shadow-md" : null,
        )}
      >
        <div className="relative aspect-[16/10] w-full bg-surface">
          <Image
            src={imageUrl}
            alt={imageAlt ?? title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <span
            className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-[1px]"
            aria-hidden="true"
          >
            <IconInfo size={14} />
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
          <p className="text-caption text-text-secondary">
            <span className="font-medium text-text-primary">{category}</span>
            <span aria-hidden="true"> · </span>
            <span>{location}</span>
          </p>

          <h3 className="text-body-md sm:text-body-lg font-semibold leading-snug text-text-primary">
            {title}
          </h3>

          <BiasMeter
            left={bias.left}
            center={bias.center}
            right={bias.right}
            className="mt-auto"
          />

          {typeof sourceCount === "number" ? (
            <p className="text-body-sm text-text-secondary">
              {sourceCount} sources
            </p>
          ) : null}
        </div>
      </article>
    ) : (
      <article
        className={cn(
          "flex gap-4 overflow-hidden rounded-lg border border-border bg-bg-primary p-4 shadow-md",
          href ? "transition-shadow hover:shadow-lg" : null,
        )}
      >
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md bg-surface sm:h-32 sm:w-36">
          <Image
            src={imageUrl}
            alt={imageAlt ?? title}
            fill
            className="object-cover"
            sizes="144px"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-caption text-text-secondary">
            <span className="text-text-primary">{category}</span>
            <span aria-hidden="true"> · </span>
            <span>{location}</span>
          </p>

          <h3 className="text-h3 font-semibold text-text-primary">{title}</h3>

          {snippet ? (
            <p className="text-body-md text-text-secondary line-clamp-2">
              {snippet}
            </p>
          ) : null}

          <BiasMeter
            left={bias.left}
            center={bias.center}
            right={bias.right}
            className="mt-auto"
          />

          {(timeAgo || readTime) && (
            <div className="flex items-center gap-4 text-caption text-text-secondary">
              {timeAgo ? (
                <span className="inline-flex items-center gap-1">
                  <IconClock size={14} />
                  {timeAgo}
                </span>
              ) : null}
              {readTime ? (
                <span className="inline-flex items-center gap-1">
                  <IconBookmark size={14} />
                  {readTime}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </article>
    );

  if (href) {
    return (
      <a href={href} className="block h-full no-underline text-inherit">
        {content}
      </a>
    );
  }

  return content;
}
