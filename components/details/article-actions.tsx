"use client";

import { ShareArticleDialog } from "@/components/details/share-article-dialog";
import { IconBookmark, IconShare } from "@/components/icons";
import { cn } from "@/lib/cn";
import { toggleSavedArticle } from "@/lib/saved/actions";
import { useCallback, useRef, useState, useTransition } from "react";

type ArticleActionsProps = {
  articleId: string;
  title: string;
  initiallySaved: boolean;
};

const actionClass =
  "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";

export function ArticleActions({
  articleId,
  title,
  initiallySaved,
}: ArticleActionsProps) {
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  const closeShare = useCallback(() => {
    setShareOpen(false);
    shareButtonRef.current?.focus();
  }, []);

  function onSave() {
    setError("");
    const nextSaved = !saved;
    setSaved(nextSaved);
    startTransition(async () => {
      const result = await toggleSavedArticle(articleId);
      if (!result.ok) {
        setSaved(!nextSaved);
        setError(result.error);
        return;
      }
      setSaved(result.saved);
    });
  }

  function onShare() {
    setShareUrl(window.location.href);
    setShareOpen(true);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={saved ? "Remove saved article" : "Save article"}
          aria-pressed={saved}
          disabled={isPending}
          onClick={onSave}
          className={cn(actionClass, saved ? "text-text-primary" : null)}
        >
          <IconBookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <button
          ref={shareButtonRef}
          type="button"
          aria-label="Share"
          aria-haspopup="dialog"
          aria-expanded={shareOpen}
          onClick={onShare}
          className={actionClass}
        >
          <IconShare size={18} />
        </button>
      </div>
      {error ? (
        <p className="text-caption text-bias-left" role="alert">
          {error}
        </p>
      ) : null}
      {shareOpen ? (
        <ShareArticleDialog
          open
          title={title}
          url={shareUrl}
          onClose={closeShare}
        />
      ) : null}
    </div>
  );
}
