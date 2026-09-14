import { Container } from "@/components/container";
import { IconMenu } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Home", active: true, dot: false },
  { href: "#", label: "For You", active: false, dot: true },
  { href: "#", label: "Local", active: false, dot: false },
  { href: "#", label: "Blindspot", active: false, dot: false },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-bg-primary">
      <Container className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-3 md:gap-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="shrink-0 text-text-primary"
            aria-label="Open menu"
          >
            <IconMenu size={20} />
          </button>
          <Link href="/" className="min-w-0 no-underline text-inherit">
            <Logo size="responsive" />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative text-body-md font-medium no-underline",
                item.active
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
              {item.active ? (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-text-primary" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeSwitcher />
          <span className="hidden sm:contents">
            <Button variant="primary" size="sm">
              Subscribe
            </Button>
          </span>
          <Button variant="secondary" size="sm">
            Login
          </Button>
        </div>
      </Container>
    </header>
  );
}
