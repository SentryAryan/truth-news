"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { UserButton } from "@clerk/nextjs";

export function ThemedUserButton() {
  const { resolvedTheme } = useTheme();
  return (
    <UserButton
      appearance={getClerkAppearance(resolvedTheme)}
      userProfileProps={{
        appearance: getClerkAppearance(resolvedTheme),
      }}
    />
  );
}
