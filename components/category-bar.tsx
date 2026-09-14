import { IconChevronRight, IconPlus } from "@/components/icons";
import { Chip } from "@/components/ui/chip";
import { HOME_CATEGORIES } from "@/lib/mock-articles";

export function CategoryBar() {
  return (
    <div className="border-b border-border bg-bg-primary">
      <div className="mx-auto flex w-full max-w-[var(--container-truth-news)] items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3">
        <button
          type="button"
          aria-label="Add category"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-bg-secondary text-text-primary"
        >
          <IconPlus size={16} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {HOME_CATEGORIES.map((label) => (
            <Chip key={label} showPlus className="shrink-0 whitespace-nowrap">
              {label}
            </Chip>
          ))}
        </div>

        <button
          type="button"
          aria-label="Scroll categories"
          className="hidden sm:inline-flex h-8 w-8 shrink-0 items-center justify-center text-text-secondary hover:text-text-primary"
        >
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
