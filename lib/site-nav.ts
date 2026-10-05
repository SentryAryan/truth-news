export const SITE_NAV = [
  { href: "/", label: "Home", dot: false },
  { href: "#", label: "For You", dot: true },
  { href: "#", label: "Local", dot: false },
  { href: "#", label: "Blindspot", dot: false },
  { href: "/saved", label: "Saved", dot: false },
] as const;

export type SiteNavItem = (typeof SITE_NAV)[number];

export function isSiteNavActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (!href.startsWith("/")) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
