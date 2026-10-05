export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "truth-news-theme";
export const THEME_COLOR_COOKIE = "truth-news-color";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(
  mode: ThemeMode,
  systemPref: ResolvedTheme = getSystemPreference(),
): ResolvedTheme {
  if (mode === "system") {
    return systemPref;
  }
  return mode;
}

export function htmlClassForColorCookie(value: string | undefined): string {
  return value === "dark" ? "dark" : "";
}

export function writeThemeColorCookie(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COLOR_COOKIE}=${resolved}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  writeThemeColorCookie(resolved);
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(raw)) {
      return raw;
    }
  } catch {
    // Ignore storage access errors (private mode, etc.)
  }

  return "system";
}

export function writeStoredTheme(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write errors
  }
}
