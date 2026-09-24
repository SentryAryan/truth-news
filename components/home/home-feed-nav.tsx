"use client";

import { useRouter } from "next/navigation";
import {
    createContext,
    useCallback,
    useContext,
    useState,
    useTransition,
    type ReactNode,
} from "react";

type HomeFeedNavContextValue = {
  isPending: boolean;
  push: (href: string) => void;
};

const HomeFeedNavContext = createContext<HomeFeedNavContextValue | null>(null);

type HomeFeedNavProviderProps = {
  children: ReactNode;
  /** Changes when server feed params update — clears optimistic pending. */
  navKey: string;
};

export function HomeFeedNavProvider({
  children,
  navKey,
}: HomeFeedNavProviderProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  /** While equal to current navKey, show pending UI until server props catch up. */
  const [pendingFromKey, setPendingFromKey] = useState<string | null>(null);

  const push = useCallback(
    (href: string) => {
      setPendingFromKey(navKey);
      startTransition(() => {
        router.push(href);
      });
    },
    [navKey, router],
  );

  const isPending =
    isTransitionPending ||
    (pendingFromKey !== null && pendingFromKey === navKey);

  return (
    <HomeFeedNavContext.Provider value={{ isPending, push }}>
      {children}
    </HomeFeedNavContext.Provider>
  );
}

export function useHomeFeedNav(): HomeFeedNavContextValue {
  const ctx = useContext(HomeFeedNavContext);
  if (!ctx) {
    throw new Error("useHomeFeedNav must be used within HomeFeedNavProvider");
  }
  return ctx;
}
