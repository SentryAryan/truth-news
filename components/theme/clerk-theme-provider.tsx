"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

function PostHogUserIdentification() {
  const { isLoaded, user } = useUser();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (
      !isLoaded ||
      !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
      !process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      return;
    }

    const userId = user?.id ?? null;

    if (previousUserId.current === undefined) {
      previousUserId.current = userId;
    } else if (previousUserId.current !== userId) {
      if (previousUserId.current !== null) {
        posthog.reset();
      }
      previousUserId.current = userId;
    } else {
      return;
    }

    if (user) {
      posthog.identify(user.id, {
        ...(user.primaryEmailAddress?.emailAddress
          ? { email: user.primaryEmailAddress.emailAddress }
          : {}),
        ...(user.fullName ? { name: user.fullName } : {}),
      });
    }
  }, [isLoaded, user]);

  return null;
}

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
    <ClerkProvider appearance={appearance}>
      <PostHogUserIdentification />
      {children}
    </ClerkProvider>
  );
}
