/**
 * Blocking FOUC theme bootstrap.
 * Loaded from app/layout.tsx via next/script strategy="beforeInteractive".
 * Keep behavior in sync with lib/theme.ts and lib/theme-bootstrap-script.ts.
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
