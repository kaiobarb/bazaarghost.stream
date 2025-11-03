import { Suspense } from "react";
import SearchPage from "@/components/search-page";
import { getGlobalStats, getTopStreamers } from "@/lib/server-utils";

export const revalidate = 3600; // 1hr

export default async function Home() {
  const [initialStats, initialTopStreamers] = await Promise.all([
    getGlobalStats(),
    getTopStreamers(),
  ]);

  return (
    <Suspense fallback={<div />}>
      <SearchPage
        initialStats={initialStats}
        initialTopStreamers={initialTopStreamers}
      />
    </Suspense>
  );
}
