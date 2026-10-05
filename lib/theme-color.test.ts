import { describe, expect, it } from "vitest";

import { THEME_COLOR_COOKIE, htmlClassForColorCookie } from "@/lib/theme";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme-bootstrap-script";

describe("htmlClassForColorCookie", () => {
  it("adds the dark class only when the color cookie is dark", () => {
    expect(htmlClassForColorCookie("dark")).toBe("dark");
    expect(htmlClassForColorCookie("light")).toBe("");
    expect(htmlClassForColorCookie(undefined)).toBe("");
  });
});

describe("theme bootstrap script", () => {
  it("sets the color cookie before the next full page load", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_COLOR_COOKIE);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("document.cookie");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme: dark");
  });
});
