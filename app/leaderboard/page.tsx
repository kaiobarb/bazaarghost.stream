import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { fetchSeasons, fetchAllLeaderboards } from "@/lib/leaderboard-data";
import { showLeaderboard } from "@/flags";

export const revalidate = 600; // ISR: 10 minutes

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Bazaar player rankings by rating",
};

/**
 * Leaderboard page.
 *
 * Gated behind the `showLeaderboard` feature flag. Server-fetches all
 * seasons and their leaderboard data in parallel, then passes everything
 * to the client component for filtering/sorting.
 */
export default async function LeaderboardPage() {
  const enabled = await showLeaderboard();
  if (!enabled) notFound();

  const seasons = await fetchSeasons();
  const leaderboardBySeason = await fetchAllLeaderboards(seasons);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-6">
      <LeaderboardTable
        seasons={seasons}
        leaderboardBySeason={leaderboardBySeason}
      />
    </div>
  );
}
