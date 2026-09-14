/**
 * Blocking FOUC theme bootstrap. Keep key/rules in sync with lib/theme.ts.
 * Loaded via <script src> from the root layout (not next/script — that is a
 * Client Component and triggers React 19's "script tag while rendering" error).
 */
(function () {
  try {
    var k = "truth-news-theme";
    var m = localStorage.getItem(k);
    if (m !== "light" && m !== "dark" && m !== "system") {
      m = "system";
    }
    var dark =
      m === "dark" ||
      (m === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    var r = document.documentElement;
    if (dark) {
      r.classList.add("dark");
    } else {
      r.classList.remove("dark");
    }
  } catch {
    /* ignore private-mode / storage errors */
  }
})();
