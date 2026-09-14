"use client";

import { IconMenu } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SITE_NAV } from "@/lib/site-nav";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export function SiteHeaderMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-primary hover:bg-surface"
      >
        {open ? (
          <span className="relative block h-4 w-4" aria-hidden>
            <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rotate-45 bg-current" />
            <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 -rotate-45 bg-current" />
          </span>
        ) : (
          <IconMenu size={20} />
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-bg-primary py-2 shadow-md"
        >
          <nav className="flex flex-col">
            {SITE_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "relative px-4 py-2.5 text-body-md font-medium no-underline",
                  item.active
                    ? "bg-surface text-text-primary"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary",
                )}
              >
                {item.label}
                {item.dot ? (
                  <span
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-bias-left align-middle"
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-2 flex flex-col gap-2 border-t border-border px-3 pt-3 pb-1">
            <Button variant="primary" size="sm" className="w-full">
              Subscribe
            </Button>
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="no-underline"
                onClick={() => setOpen(false)}
              >
                <Button variant="secondary" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center justify-center py-1">
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      ) : null}
    </div>
  );
}
