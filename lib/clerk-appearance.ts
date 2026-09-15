import type { ResolvedTheme } from "@/lib/theme";
import { dark } from "@clerk/ui/themes";

const shared = {
  borderRadius: "0.375rem",
  fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
  fontFamilyButtons: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
} as const;

const lightVariables = {
  ...shared,
  colorPrimary: "#0D0D0F",
  colorBackground: "#FFFFFF",
  colorInputBackground: "#FFFFFF",
  colorInputText: "#0D0D0F",
  colorText: "#0D0D0F",
  colorTextSecondary: "#6B7280",
  colorNeutral: "#6B7280",
  colorMuted: "#F6F6F6",
  colorMutedForeground: "#6B7280",
  colorBorder: "#E5E7EB",
  colorShimmer: "#F0F0F0",
  colorDanger: "#B42318",
  colorSuccess: "#1D4ED8",
} as const;

const darkVariables = {
  ...shared,
  colorPrimary: "#F5F5F5",
  colorBackground: "#0D0D0F",
  colorInputBackground: "#17171A",
  colorInputText: "#F5F5F5",
  colorText: "#F5F5F5",
  colorTextSecondary: "#9CA3AF",
  colorNeutral: "#9CA3AF",
  colorMuted: "#17171A",
  colorMutedForeground: "#9CA3AF",
  colorBorder: "#2A2A2E",
  colorShimmer: "#1C1C1F",
  colorDanger: "#F04438",
  colorSuccess: "#3B82F6",
} as const;

export type ClerkAppearanceConfig = {
  theme?: typeof dark;
  variables: typeof lightVariables | typeof darkVariables;
};

/**
 * Clerk appearance aligned to truth-news light/dark tokens.
 * Used by ClerkProvider and SignIn / SignUp / UserButton instances.
 */
export function getClerkAppearance(
  resolvedTheme: ResolvedTheme,
): ClerkAppearanceConfig {
  if (resolvedTheme === "dark") {
    return {
      theme: dark,
      variables: darkVariables,
    };
  }

  return {
    variables: lightVariables,
  };
}
