import { HeaderAuthSlot } from "@/components/auth/header-auth-slot";
import { Container } from "@/components/container";
import { SiteHeaderMenu } from "@/components/layout/site-header-menu";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SITE_NAV } from "@/lib/site-nav";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export async function SiteHeader() {
  const { isAuthenticated } = await auth();
  const initialSignedIn = Boolean(isAuthenticated);

  return (
    <header className="border-b border-border bg-bg-primary">
      <Container className="flex h-14 sm:h-16 items-center justify-between gap-3 lg:gap-6">
        <Link href="/" className="min-w-0 no-underline text-inherit">
          <Logo size="responsive" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {SITE_NAV.map((item) => (
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
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="primary" size="sm">
              Subscribe
            </Button>
            <HeaderAuthSlot initialSignedIn={initialSignedIn} />
          </div>
          <SiteHeaderMenu initialSignedIn={initialSignedIn} />
        </div>
      </Container>
    </header>
  );
}
