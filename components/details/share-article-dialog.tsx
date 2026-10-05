"use client";

import {
    IconBrandX,
    IconFacebook,
    IconLinkedIn,
    IconMail,
    IconReddit,
    IconTelegram,
    IconWhatsApp,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
    buildShareTargets,
    type SharePlatformId,
} from "@/lib/share/platforms";
import { useEffect, useId, useRef, useState, type ComponentType } from "react";

type ShareArticleDialogProps = {
  open: boolean;
  title: string;
  url: string;
  onClose: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const shareIcons: Record<
  SharePlatformId,
  ComponentType<{ size?: number }>
> = {
  x: IconBrandX,
  facebook: IconFacebook,
  linkedin: IconLinkedIn,
  whatsapp: IconWhatsApp,
  reddit: IconReddit,
  telegram: IconTelegram,
  email: IconMail,
};

export function ShareArticleDialog({
  open,
  title,
  url,
  onClose,
}: ShareArticleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const targets = url ? buildShareTargets({ url, title }) : [];

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopied(false);
      setCopyError("Could not copy the link.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close share dialog"
        className="absolute inset-0 bg-text-primary/40"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-bg-primary p-4 shadow-md sm:p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-h3 font-semibold text-text-primary">
              Share article
            </h2>
            <p className="mt-1 line-clamp-2 text-body-sm text-text-secondary">
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            <span aria-hidden="true" className="text-body-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <Button
          variant="secondary"
          className="mb-3 w-full"
          onClick={() => {
            void copyLink();
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        {copyError ? (
          <p className="mb-3 text-caption text-bias-left" role="alert">
            {copyError}
          </p>
        ) : null}

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {targets.map((target) => {
            const Icon = shareIcons[target.id];
            return (
              <li key={target.id}>
                <a
                  href={target.href}
                  target={target.id === "email" ? undefined : "_blank"}
                  rel={target.id === "email" ? undefined : "noopener noreferrer"}
                  className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-body-md font-medium text-text-primary no-underline hover:bg-surface"
                >
                  <Icon size={18} />
                  {target.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
