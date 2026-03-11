import type React from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { draftMode } from "next/headers";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { VercelToolbar } from "@vercel/toolbar/next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import Navbar from "@/components/layout/navbar";
import { GlobalSearchHeader } from "@/components/search/global-search-header";
import { getGlobalStats } from "@/lib/server-utils";
import { showSearchTabs, showLeaderboard } from "@/flags";
import "./globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const averiaLibre = localFont({
  src: [
    {
      path: "../public/Averia_Libre/AveriaLibre-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/Averia_Libre/AveriaLibre-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/Averia_Libre/AveriaLibre-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/Averia_Libre/AveriaLibre-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/Averia_Libre/AveriaLibre-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/Averia_Libre/AveriaLibre-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-averia-libre",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bazaarghost.stream"),
  title: {
    default: "BazaarGhost - Bazaar Matchup Search",
    template: "%s | BazaarGhost",
  },
  description:
    "Search and discover Bazaar ghost matchups from thousands of Twitch VODs. Find when streamers played against specific opponents.",
  keywords: [
    "Bazaar",
    "ghost matchups",
    "Twitch VODs",
    "streamers",
    "gaming",
    "matchup search",
    "BazaarGhost",
  ],
  authors: [{ name: "BazaarGhost" }],
  creator: "BazaarGhost",
  publisher: "BazaarGhost",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bazaarghost.stream",
    siteName: "BazaarGhost",
    title: "BazaarGhost - Bazaar Matchup Search",
    description:
      "Search and discover Bazaar ghost matchups from thousands of Twitch VODs",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "BazaarGhost Logo",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary",
    title: "BazaarGhost - Bazaar Matchup Search",
    description:
      "Search and discover Bazaar ghost matchups from thousands of Twitch VODs",
    images: ["/logo.png"],
  },

  // Icons - Next.js will auto-generate link tags from files in /app
  icons: {
    icon: [
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/icon1.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  // Manifest
  manifest: "/manifest.json",

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf9ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ isEnabled: isAdmin }, stats, searchTabs, leaderboard] =
    await Promise.all([
      draftMode(),
      getGlobalStats(),
      showSearchTabs(),
      showLeaderboard(),
    ]);
  const showToolbar = isAdmin || process.env.NODE_ENV === "development";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased font-sans ${inter.variable} ${jetbrainsMono.variable} ${averiaLibre.variable}`}
      >
        <ThemeProvider>
          <div className="flex h-svh flex-col bg-background">
            <Navbar showLeaderboard={leaderboard} />
            <p className="shrink-0 border-b border-sidebar-border py-1 text-center font-mono text-xs text-muted-foreground">
              tracking {stats.streamers} streamers &middot; {stats.vods} vods
              &middot; {stats.matchups} matchups
            </p>
            <div className="shrink-0 border-b border-sidebar-border">
              <div className="mx-auto max-w-6xl px-4">
                <Suspense>
                  <GlobalSearchHeader showSearchTabs={searchTabs} />
                </Suspense>
              </div>
            </div>
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        {showToolbar && <VercelToolbar />}
      </body>
    </html>
  );
}
