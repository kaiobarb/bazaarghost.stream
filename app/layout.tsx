import type React from "react";
import type { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import "./globals.css";

import {
  Inter,
  Geist as V0_Font_Geist,
  Geist_Mono as V0_Font_Geist_Mono,
  Source_Serif_4 as V0_Font_Source_Serif_4,
} from "next/font/google";
import localFont from "next/font/local";

// Initialize fonts
const _geist = V0_Font_Geist({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
const _geistMono = V0_Font_Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
const _sourceSerif_4 = V0_Font_Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
});

export const metadata: Metadata = {
  title: "BazaarGhost",
  description: "Search for Bazaar ghost matchups against streamers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <meta name="apple-mobile-web-app-title" content="BazaarGhost" />
      <body className={`antialiased font-sans ${inter.variable} ${averiaLibre.variable}`}>
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            {children}
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
