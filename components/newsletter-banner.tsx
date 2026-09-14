import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export function NewsletterBanner() {
  return (
    <section className="border-t border-border bg-surface">
      <Container className="flex flex-col items-stretch justify-between gap-6 py-10 sm:flex-row sm:items-center sm:gap-10 sm:py-12">
        <div className="min-w-0">
          <h2 className="text-h3 font-bold text-text-primary">
            Stay Informed. Stay Balanced.
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Get the top stories and bias analysis delivered to your inbox.
          </p>
        </div>

        <form
          className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
          aria-label="Newsletter signup"
        >
          <label className="sr-only" htmlFor="newsletter-email">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-4 py-2.5 text-body-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right"
          />
          <Button type="button" variant="primary" className="shrink-0">
            Subscribe
          </Button>
        </form>
      </Container>
    </section>
  );
}
