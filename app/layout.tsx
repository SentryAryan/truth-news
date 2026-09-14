import { ThemeProvider } from "@/components/theme/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const clerkAppearance = {
  variables: {
    colorPrimary: "#0D0D0F",
    borderRadius: "0.375rem",
    fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
  },
} as const;

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
      <head>
        {/*
          External sync script in a Server Component — do NOT use next/script here.
          next/script is a Client Component and triggers React 19's
          "Encountered a script tag while rendering React component" console error.
          Sync load is intentional for FOUC-free theme before first paint.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- blocking theme bootstrap before paint */}
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ClerkProvider appearance={clerkAppearance}>
          <ThemeProvider>{children}</ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
