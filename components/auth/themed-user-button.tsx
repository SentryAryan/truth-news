"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { UserButton } from "@clerk/nextjs";
import { useMemo } from "react";

export function ThemedUserButton() {
  const { resolvedTheme } = useTheme();
  const appearance = useMemo(
    () => getClerkAppearance(resolvedTheme),
    [resolvedTheme],
  );

  return (
    <UserButton
      appearance={appearance}
      userProfileProps={{ appearance }}
    />
  );
}
