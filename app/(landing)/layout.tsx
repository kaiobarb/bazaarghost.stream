import type React from "react";
import Navbar from "@/components/navbar";
import { getGlobalStats } from "@/lib/server-utils";
import { LandingSearch } from "./landing-search";

/**
 * Layout for the marketing / landing page.
 *
 * Renders the shared navbar, stats strip, and a lightweight search bar
 * (matching the `(app)` layout visually) above the scrollable page content.
 */
export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await getGlobalStats();

  return (
    <>
      <Navbar />
      <p className="shrink-0 border-b border-sidebar-border py-1 text-center font-mono text-xs text-muted-foreground">
        tracking {stats.streamers} streamers &middot; {stats.vods} vods &middot;{" "}
        {stats.matchups} matchups
      </p>
      <div className="border-b border-sidebar-border">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <LandingSearch />
        </div>
      </div>
      {children}
    </>
  );
}
