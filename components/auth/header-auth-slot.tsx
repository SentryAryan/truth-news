"use client";

import { ThemedUserButton } from "@/components/auth/themed-user-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";

type HeaderAuthSlotProps = {
  /** Server-seeded signed-in hint for first paint before Clerk is loaded. */
  initialSignedIn?: boolean;
  /** Stretch Login to full width (mobile menu). */
  fullWidth?: boolean;
  /** Called when the Login link is activated (e.g. close mobile menu). */
  onNavigate?: () => void;
  className?: string;
};

function AuthAvatarSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 rounded-full bg-surface animate-pulse",
        className,
      )}
      aria-hidden="true"
    />
  );
}

function LoginButton({
  fullWidth,
  onNavigate,
}: {
  fullWidth?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/sign-in"
      className={cn("no-underline", fullWidth && "w-full")}
      onClick={onNavigate}
    >
      <Button
        variant="secondary"
        size="sm"
        className={fullWidth ? "w-full" : undefined}
      >
        Login
      </Button>
    </Link>
  );
}

/**
 * Header auth chrome that reserves space while Clerk hydrates.
 * Uses server `initialSignedIn` until `useAuth().isLoaded`, then live session state.
 */
export function HeaderAuthSlot({
  initialSignedIn = false,
  fullWidth = false,
  onNavigate,
  className,
}: HeaderAuthSlotProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = isLoaded ? Boolean(isSignedIn) : initialSignedIn;

  let content: ReactNode;
  if (!isLoaded && signedIn) {
    content = <AuthAvatarSkeleton />;
  } else if (signedIn) {
    content = <ThemedUserButton />;
  } else {
    content = <LoginButton fullWidth={fullWidth} onNavigate={onNavigate} />;
  }

  return (
    <div
      className={cn(
        "flex min-h-8 min-w-8 items-center justify-center",
        fullWidth && "w-full",
        className,
      )}
      aria-busy={!isLoaded}
    >
      {content}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {!isLoaded ? "Loading account" : signedIn ? "Account" : "Sign in"}
      </span>
    </div>
  );
}
