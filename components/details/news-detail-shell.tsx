"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { NewsDetailSkeleton } from "@/components/details/news-detail-skeleton";

type NewsDetailNavContextValue = {
  isPending: boolean;
  push: (href: string) => void;
};

const NewsDetailNavContext = createContext<NewsDetailNavContextValue | null>(
  null,
);

type NewsDetailShellProps = {
  articleId: string;
  children: ReactNode;
};

export function NewsDetailShell({ articleId, children }: NewsDetailShellProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [pendingFromKey, setPendingFromKey] = useState<string | null>(null);

  const push = useCallback(
    (href: string) => {
      setPendingFromKey(articleId);
      startTransition(() => {
        router.push(href);
      });
    },
    [articleId, router],
  );

  const isPending =
    isTransitionPending ||
    (pendingFromKey !== null && pendingFromKey === articleId);

  return (
    <NewsDetailNavContext.Provider value={{ isPending, push }}>
      {isPending ? <NewsDetailSkeleton /> : children}
    </NewsDetailNavContext.Provider>
  );
}

export function useNewsDetailNav(): NewsDetailNavContextValue {
  const ctx = useContext(NewsDetailNavContext);
  if (!ctx) {
    throw new Error("useNewsDetailNav must be used within NewsDetailShell");
  }
  return ctx;
}
