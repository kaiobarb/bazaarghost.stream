import { Suspense } from "react";
import type { Metadata } from "next";
import UnifiedSearch from "@/components/unified-search";
import { getGlobalStats } from "@/lib/server-utils";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search for ghost matchups, VODs, and streamers across thousands of Twitch streams.",
};

export default async function SearchPage() {
  const stats = await getGlobalStats();

  return (
    <Suspense>
      <UnifiedSearch initialStats={stats} />
    </Suspense>
  );
}
