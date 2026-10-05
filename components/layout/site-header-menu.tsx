"use client";

import { HeaderAuthSlot } from "@/components/auth/header-auth-slot";
import { IconMenu } from "@/components/icons";
import { SiteNavLinks } from "@/components/layout/site-nav-links";
import { Button } from "@/components/ui/button";
import { useEffect, useId, useRef, useState } from "react";

type SiteHeaderMenuProps = {
  initialSignedIn?: boolean;
};

export function SiteHeaderMenu({
  initialSignedIn = false,
}: SiteHeaderMenuProps) {
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
            <SiteNavLinks variant="menu" onNavigate={() => setOpen(false)} />
          </nav>

          <div className="mt-2 flex flex-col gap-2 border-t border-border px-3 pt-3 pb-1">
            <Button variant="primary" size="sm" className="w-full">
              Subscribe
            </Button>
            <HeaderAuthSlot
              initialSignedIn={initialSignedIn}
              fullWidth
              className="py-1"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
