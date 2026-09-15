/**
 * Blocking FOUC theme bootstrap (standalone copy for reference / CDN).
 * The live app inlines this via lib/theme-bootstrap-script.ts in app/layout.tsx
 * — React 19 does not execute external <script src> from components.
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
