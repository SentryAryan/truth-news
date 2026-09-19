"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { ClerkProvider } from "@clerk/nextjs";
import { useMemo, type ReactNode } from "react";

/**
 * Wraps Clerk inside ThemeProvider so UserButton, SignIn, SignUp, and
 * the profile card follow the app light/dark resolved theme.
 */
export function ClerkThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const appearance = useMemo(
    () => getClerkAppearance(resolvedTheme),
    [resolvedTheme],
  );

  return (
    <ClerkProvider appearance={appearance}>{children}</ClerkProvider>
  );
}
