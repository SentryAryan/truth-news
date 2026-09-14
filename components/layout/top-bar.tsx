import { Container } from "@/components/container";
import { IconChevronDown, IconGlobe } from "@/components/icons";

export function TopBar() {
  return (
    <div className="bg-chrome text-chrome-foreground">
      <Container className="flex h-9 sm:h-10 items-center justify-between gap-2 text-caption sm:text-body-sm">
        <button
          type="button"
          className="hidden text-chrome-muted transition-colors hover:text-chrome-foreground md:inline"
        >
          Browser Extension
        </button>

        <p className="min-w-0 truncate text-chrome-muted md:flex-1 md:text-center">
          Monday, June 1, 2026
        </p>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="hidden text-chrome-muted transition-colors hover:text-chrome-foreground lg:inline"
          >
            Set Location
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-chrome-muted transition-colors hover:text-chrome-foreground"
          >
            <IconGlobe size={14} />
            <span className="hidden sm:inline">International Edition</span>
            <span className="sm:hidden">Edition</span>
            <IconChevronDown size={14} />
          </button>
        </div>
      </Container>
    </div>
  );
}
