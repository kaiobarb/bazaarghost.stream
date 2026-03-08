import type React from "react";
import { Suspense } from "react";
import { EmbedProvider } from "@/components/embed-provider";
import SearchPanel from "@/components/search-panel";
import Navbar from "@/components/navbar";
import { getGlobalStats } from "@/lib/server-utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await getGlobalStats();

  return (
    <EmbedProvider>
      <div className="flex h-svh flex-col overflow-hidden">
        <Navbar />
        <p className="shrink-0 border-b border-sidebar-border py-1 text-center font-mono text-xs text-muted-foreground">
          tracking {stats.streamers} streamers &middot; {stats.vods} vods
          &middot; {stats.matchups} matchups
        </p>
        {/* children renders GhostLoader (null) on embed routes, nothing on search routes */}
        {children}
        <Suspense>
          <SearchPanel />
        </Suspense>
      </div>
    </EmbedProvider>
  );
}
