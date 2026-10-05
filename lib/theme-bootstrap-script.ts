import { THEME_COLOR_COOKIE, THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Blocking inline bootstrap. Sets the dark class and the color cookie before paint.
 * Keep behavior in sync with public/theme-init.js and lib/theme.ts.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var c=${JSON.stringify(THEME_COLOR_COOKIE)};var m=localStorage.getItem(k);if(m!=="light"&&m!=="dark"&&m!=="system"){m="system"}var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(dark){r.classList.add("dark")}else{r.classList.remove("dark")}var secure=location.protocol==="https:"?"; Secure":"";document.cookie=c+"="+(dark?"dark":"light")+"; Path=/; Max-Age=31536000; SameSite=Lax"+secure}catch(e){}})();`;
