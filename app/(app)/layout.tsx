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
      <Navbar />
      {/* children renders GhostLoader (null) on embed routes, nothing on search routes */}
      {children}
      <Suspense>
        <SearchPanel initialStats={stats} />
      </Suspense>
    </EmbedProvider>
  );
}
