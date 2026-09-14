import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Blocking inline script — runs before paint to avoid FOUC.
 * Must stay in sync with lib/theme.ts storage key and resolution rules.
 */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=localStorage.getItem(k);if(m!=="light"&&m!=="dark"&&m!=="system"){m="system";}var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(dark){r.classList.add("dark");}else{r.classList.remove("dark");}}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
