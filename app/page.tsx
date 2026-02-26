import { Suspense } from "react";
import UnifiedSearch from "@/components/unified-search";
import { getGlobalStats } from "@/lib/server-utils";

export const revalidate = 3600; // 1hr

export default async function Home() {
  const stats = await getGlobalStats();

  return (
    <Suspense>
      <UnifiedSearch initialStats={stats} />
    </Suspense>
  );
}
