import type React from "react";
import type { Metadata } from "next";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import "./globals.css";

import { Inter } from "next/font/google";
import localFont from "next/font/local";

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
      <body
        className={`antialiased font-sans ${inter.variable} ${averiaLibre.variable}`}
      >
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            {children}
          </div>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
