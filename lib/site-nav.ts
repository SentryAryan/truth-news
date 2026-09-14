export const SITE_NAV = [
  { href: "/", label: "Home", active: true, dot: false },
  { href: "#", label: "For You", active: false, dot: true },
  { href: "#", label: "Local", active: false, dot: false },
  { href: "#", label: "Blindspot", active: false, dot: false },
] as const;

export type SiteNavItem = (typeof SITE_NAV)[number];
