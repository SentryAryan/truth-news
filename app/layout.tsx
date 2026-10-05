import { ClerkThemeProvider } from "@/components/theme/clerk-theme-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_COLOR_COOKIE, htmlClassForColorCookie } from "@/lib/theme";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme-bootstrap-script";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "truth-news",
  description: "Balanced news coverage, powered by AI.",
  icons: {
    icon: [
      {
        url: "/icons/project/truth-news-favicon-black.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/project/truth-news-favicon-white.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/icons/project/truth-news-favicon-black.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const themeClass = htmlClassForColorCookie(
    cookieStore.get(THEME_COLOR_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      className={[poppins.variable, "h-full antialiased", themeClass]
        .filter(Boolean)
        .join(" ")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider>
          <ClerkThemeProvider>{children}</ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
