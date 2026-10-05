/**
 * Blocking FOUC theme bootstrap.
 * The app inlines lib/theme-bootstrap-script.ts. This file stays in sync for
 * any direct /theme-init.js request.
 * Keep behavior in sync with lib/theme-bootstrap-script.ts and lib/theme.ts.
 */
(function () {
  try {
    var k = "truth-news-theme";
    var c = "truth-news-color";
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
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      c +
      "=" +
      (dark ? "dark" : "light") +
      "; Path=/; Max-Age=31536000; SameSite=Lax" +
      secure;
  } catch {
    /* ignore private-mode / storage errors */
  }
})();
