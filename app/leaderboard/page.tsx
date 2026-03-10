import { Suspense } from "react";
import type { Metadata } from "next";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { SAMPLE_LEADERBOARD_DATA } from "@/lib/leaderboard-data";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Bazaar player rankings by rating",
};

export default function LeaderboardPage() {
  // TODO: Replace with database fetch
  const data = SAMPLE_LEADERBOARD_DATA;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-6">
      <Suspense fallback={<div />}>
        <LeaderboardTable data={data} />
      </Suspense>
    </div>
  );
}
