import { Container } from "@/components/container";
import {
  IconInstagram,
  IconLinkedIn,
  IconX,
  IconYouTube,
} from "@/components/icons";
import { Logo } from "@/components/logo";
import Link from "next/link";

const COMPANY = ["About", "Careers", "Press", "Contact"] as const;
const HELP = [
  "Help Center",
  "Guides",
  "Privacy Policy",
  "Terms of Service",
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-chrome text-chrome-foreground">
      <Container className="py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Logo tone="onDark" />
            <p className="max-w-xs text-body-sm text-chrome-muted">
              Balanced news coverage powered by AI.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-body-md font-semibold">Company</h3>
            <ul className="flex flex-col gap-2">
              {COMPANY.map((label) => (
                <li key={label}>
                  <Link
                    href="#"
                    className="text-body-sm text-chrome-muted no-underline hover:text-chrome-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-body-md font-semibold">Help</h3>
            <ul className="flex flex-col gap-2">
              {HELP.map((label) => (
                <li key={label}>
                  <Link
                    href="#"
                    className="text-body-sm text-chrome-muted no-underline hover:text-chrome-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-body-md font-semibold">Connect</h3>
            <div className="flex items-center gap-3 text-chrome-muted">
              <a
                href="#"
                aria-label="X"
                className="hover:text-chrome-foreground"
              >
                <IconX size={18} />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="hover:text-chrome-foreground"
              >
                <IconLinkedIn size={18} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="hover:text-chrome-foreground"
              >
                <IconInstagram size={18} />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="hover:text-chrome-foreground"
              >
                <IconYouTube size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-4 sm:mt-10">
          <p className="text-caption text-chrome-muted">
            © 2026 truth-news. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
