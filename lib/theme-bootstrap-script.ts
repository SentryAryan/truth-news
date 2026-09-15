import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Inline FOUC bootstrap for the root layout.
 * Keep behavior in sync with public/theme-init.js and lib/theme.ts.
 * Must be an inline script (dangerouslySetInnerHTML) — React 19 does not
 * execute external <script src> tags rendered from components.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=localStorage.getItem(k);if(m!=="light"&&m!=="dark"&&m!=="system"){m="system"}var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(dark){r.classList.add("dark")}else{r.classList.remove("dark")}}catch(e){}})();`;
