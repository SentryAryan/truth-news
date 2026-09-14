import { DesignSystemShowcase } from "@/components/design-system/showcase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System · truth-news",
  description: "truth-news design tokens, primitives, and theme switcher showcase.",
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
