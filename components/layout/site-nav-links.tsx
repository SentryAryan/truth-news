"use client";

import { cn } from "@/lib/cn";
import { isSiteNavActive, SITE_NAV } from "@/lib/site-nav";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type SiteNavLinksProps = {
  variant: "bar" | "menu";
  onNavigate?: () => void;
};

export function SiteNavLinks({ variant, onNavigate }: SiteNavLinksProps) {
  const pathname = usePathname();
  const router = useRouter();

  function follow(event: { preventDefault: () => void }, href: string) {
    if (!onNavigate) {
      return;
    }
    if (href.startsWith("/")) {
      event.preventDefault();
      router.push(href);
    }
    onNavigate();
  }

  return (
    <>
      {SITE_NAV.map((item) => {
        const active = isSiteNavActive(item.href, pathname);
        if (variant === "bar") {
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => follow(event, item.href)}
              className={cn(
                "relative text-body-md font-medium no-underline",
                active
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {item.label}
              {item.dot ? (
                <span
                  className="absolute -top-1 -right-2 h-1.5 w-1.5 rounded-full bg-bias-left"
                  aria-hidden="true"
                />
              ) : null}
              {active ? (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-text-primary" />
              ) : null}
            </Link>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            role="menuitem"
            aria-current={active ? "page" : undefined}
            onClick={(event) => follow(event, item.href)}
            className={cn(
              "relative px-4 py-2.5 text-body-md font-medium no-underline",
              active
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
        );
      })}
    </>
  );
}
