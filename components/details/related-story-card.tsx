import type { RelatedStory } from "@/lib/types/article-display";
import Image from "next/image";
import Link from "next/link";

type RelatedStoryCardProps = {
  story: RelatedStory;
};

export function RelatedStoryCard({ story }: RelatedStoryCardProps) {
  return (
    <Link
      href={`/news/${story.id}`}
      className="flex gap-3 rounded-lg border border-border bg-bg-primary p-3 no-underline text-inherit transition-shadow hover:shadow-sm"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface">
        <Image
          src={story.imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-text-secondary">
          <span className="font-medium text-text-primary">{story.category}</span>
          <span aria-hidden="true"> · </span>
          <span>{story.location}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 text-body-sm font-semibold leading-snug text-text-primary">
          {story.title}
        </h3>
        <p className="mt-2 text-caption text-text-secondary">
          {story.publishedDate}
          <span aria-hidden="true"> · </span>
          {story.readTime}
        </p>
      </div>
    </Link>
  );
}
