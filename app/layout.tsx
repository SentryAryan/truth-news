import { ClerkThemeProvider } from "@/components/theme/clerk-theme-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {/* beforeInteractive avoids React 19 raw <script> warnings and still runs pre-hydration */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <ClerkThemeProvider>{children}</ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
