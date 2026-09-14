"use client";

import {
    IconChevronDown,
    IconMonitor,
    IconMoon,
    IconSun,
} from "@/components/icons";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import type { ThemeMode } from "@/lib/theme";
import { useEffect, useId, useRef, useState } from "react";

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  Icon: typeof IconSun;
}> = [
  { mode: "light", label: "Light", Icon: IconSun },
  { mode: "dark", label: "Dark", Icon: IconMoon },
  { mode: "system", label: "System", Icon: IconMonitor },
];

type ThemeSwitcherProps = {
  className?: string;
};

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const current = OPTIONS.find((option) => option.mode === theme) ?? OPTIONS[2];
  const CurrentIcon = current.Icon;

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
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Theme: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 sm:px-2.5",
          "text-text-primary transition-colors hover:bg-surface",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right",
        )}
      >
        <CurrentIcon size={16} />
        <span className="hidden sm:inline text-body-sm font-medium">
          {current.label}
        </span>
        <IconChevronDown
          size={14}
          className={cn(
            "text-text-secondary transition-transform",
            open ? "rotate-180" : null,
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Color theme"
          className={cn(
            "absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-md border border-border",
            "bg-bg-primary py-1 shadow-md",
          )}
        >
          {OPTIONS.map(({ mode, label, Icon }) => {
            const selected = theme === mode;
            return (
              <button
                key={mode}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(mode);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm transition-colors",
                  selected
                    ? "bg-surface text-text-primary font-medium"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary",
                )}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
