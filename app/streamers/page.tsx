import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllStreamers } from "@/lib/server-utils";
import { StreamerList } from "@/components/streamer-list";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Streamers",
  description:
    "Browse all tracked Bazaar streamers and their VODs on BazaarGhost.",
};

export default async function StreamersPage() {
  const streamers = await getAllStreamers();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to search
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Streamers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {streamers.length} streamers tracked
        </p>
      </div>

      <StreamerList streamers={streamers} />
    </main>
  );
}
