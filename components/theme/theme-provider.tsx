"use client";

import {
    THEME_STORAGE_KEY,
    applyResolvedTheme,
    getSystemPreference,
    readStoredTheme,
    resolveTheme,
    writeStoredTheme,
    type ResolvedTheme,
    type ThemeMode,
} from "@/lib/theme";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from "react";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const themeListeners = new Set<() => void>();

function emitThemeChange(): void {
  for (const listener of themeListeners) {
    listener();
  }
}

function subscribeToTheme(listener: () => void): () => void {
  themeListeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => {
    const mode = readStoredTheme();
    applyResolvedTheme(resolveTheme(mode, getSystemPreference()));
    emitThemeChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      const mode = readStoredTheme();
      applyResolvedTheme(resolveTheme(mode, getSystemPreference()));
      emitThemeChange();
    }
  };

  media.addEventListener("change", onMediaChange);
  window.addEventListener("storage", onStorage);

  return () => {
    themeListeners.delete(listener);
    media.removeEventListener("change", onMediaChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getThemeSnapshot(): ThemeMode {
  return readStoredTheme();
}

function getThemeServerSnapshot(): ThemeMode {
  return "system";
}

function subscribeToSystem(listener: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getSystemSnapshot(): ResolvedTheme {
  return getSystemPreference();
}

function getSystemServerSnapshot(): ResolvedTheme {
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const systemPref = useSyncExternalStore(
    subscribeToSystem,
    getSystemSnapshot,
    getSystemServerSnapshot,
  );
  const resolvedTheme = resolveTheme(theme, systemPref);

  const setTheme = useCallback((mode: ThemeMode) => {
    writeStoredTheme(mode);
    applyResolvedTheme(resolveTheme(mode, getSystemPreference()));
    emitThemeChange();
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
