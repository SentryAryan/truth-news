import { HeaderAuthSlot } from "@/components/auth/header-auth-slot";
import { Container } from "@/components/container";
import { SiteHeaderMenu } from "@/components/layout/site-header-menu";
import { SiteNavLinks } from "@/components/layout/site-nav-links";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
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
          <SiteNavLinks variant="bar" />
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
