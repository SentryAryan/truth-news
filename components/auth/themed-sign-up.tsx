"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { SignUp } from "@clerk/nextjs";

export function ThemedSignUp() {
  const { resolvedTheme } = useTheme();
  return <SignUp appearance={getClerkAppearance(resolvedTheme)} />;
}
