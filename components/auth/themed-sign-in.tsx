"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { SignIn } from "@clerk/nextjs";

export function ThemedSignIn() {
  const { resolvedTheme } = useTheme();
  return <SignIn appearance={getClerkAppearance(resolvedTheme)} />;
}
