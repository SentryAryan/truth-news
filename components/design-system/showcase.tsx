"use client";

import { ArticleCard } from "@/components/article-card";
import { BiasMeter } from "@/components/bias-meter";
import { Container } from "@/components/container";
import {
    IconBookmark,
    IconClock,
    IconInfo,
    IconMenu,
    IconSearch,
} from "@/components/icons";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const SWATCHES: Array<{ label: string; className: string; hexHint: string }> = [
  { label: "Text Primary", className: "bg-text-primary", hexHint: "text-primary" },
  {
    label: "Text Secondary",
    className: "bg-text-secondary",
    hexHint: "text-secondary",
  },
  { label: "Surface", className: "bg-surface", hexHint: "surface" },
  { label: "Left Bias", className: "bg-bias-left", hexHint: "bias-left" },
  { label: "Center", className: "bg-bias-center", hexHint: "bias-center" },
  { label: "Right Bias", className: "bg-bias-right", hexHint: "bias-right" },
  { label: "BG Primary", className: "bg-bg-primary", hexHint: "bg-primary" },
  {
    label: "BG Secondary",
    className: "bg-bg-secondary",
    hexHint: "bg-secondary",
  },
  { label: "Border", className: "bg-border", hexHint: "border" },
  { label: "Divider", className: "bg-divider", hexHint: "divider" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2 font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemShowcase() {
  return (
    <main className="flex-1 bg-bg-primary py-10">
      <Container className="flex flex-col gap-10">
        <header className="flex flex-col gap-4 border-b border-divider pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo tagline="Balanced news coverage, powered by AI." />
            <p className="text-caption text-text-secondary">
              Design System v1.0 — light + derived dark tokens
            </p>
          </div>
          <ThemeSwitcher className="shrink-0" />
        </header>

        <Section title="Colors">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {SWATCHES.map((swatch) => (
              <div key={swatch.label} className="flex flex-col gap-2">
                <div
                  className={cn(
                    "h-16 w-full rounded-md border border-border shadow-sm",
                    swatch.className,
                  )}
                />
                <div>
                  <p className="text-body-sm font-medium text-text-primary">
                    {swatch.label}
                  </p>
                  <p className="text-caption text-text-secondary">
                    {swatch.hexHint}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <p className="text-h1 font-bold text-text-primary">H1 Page title</p>
          <p className="text-h2 font-semibold text-text-primary">
            H2 Section title
          </p>
          <p className="text-h3 font-semibold text-text-primary">
            H3 Card title
          </p>
          <p className="text-h4 font-medium text-text-primary">H4 Subheading</p>
          <p className="text-body-lg text-text-primary">
            Body large — important content
          </p>
          <p className="text-body-md text-text-primary">
            Body medium — body text
          </p>
          <p className="text-body-sm text-text-primary">
            Body small — supporting text
          </p>
          <p className="text-caption text-text-secondary">
            Caption — labels, meta text
          </p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="text">Text</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
        </Section>

        <Section title="Chips / Categories">
          <div className="flex flex-wrap gap-2">
            <Chip showPlus>World Cup</Chip>
            <Chip showPlus>IPL</Chip>
            <Chip showPlus>Business & Markets</Chip>
            <Chip>Politics</Chip>
          </div>
        </Section>

        <Section title="Icons">
          <div className="flex flex-wrap items-center gap-4 text-text-primary">
            <IconMenu />
            <IconSearch />
            <IconBookmark />
            <IconClock />
            <IconInfo />
          </div>
        </Section>

        <Section title="Bias meter">
          <BiasMeter left={25} center={50} right={25} />
          <BiasMeter left={18} center={33} right={49} />
        </Section>

        <Section title="Article card">
          <ArticleCard
            variant="inline"
            title="Senate advances spending bill after late-night negotiations"
            category="Politics"
            location="United States"
            imageUrl="https://picsum.photos/seed/truth-news-preview/288/256"
            imageAlt="Capitol building exterior"
            snippet="Lawmakers reached a provisional agreement on funding levels after days of closed-door talks, with both parties claiming partial wins."
            bias={{ left: 25, center: 50, right: 25 }}
            timeAgo="2h ago"
            readTime="12 min read"
          />
        </Section>
      </Container>
    </main>
  );
}
