import type { Metadata } from "next";
import { GhostLoader } from "@/components/ghost-loader";

export const revalidate = 86400; // 1 day

type Props = {
  params: Promise<{
    streamer: string;
    username: string;
    vodId: string;
    occurrence: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer, username, vodId, occurrence } = await params;
  const streamerName = decodeURIComponent(streamer);
  const ghostName = decodeURIComponent(username);
  return {
    title: `${streamerName} vs ${ghostName} (#${occurrence})`,
    description: `Watch ${streamerName} vs ${ghostName} (occurrence ${occurrence}) in The Bazaar — VOD ${vodId} on BazaarGhost.`,
  };
}

export default async function GhostOccurrencePage({ params }: Props) {
  const { username, vodId, occurrence } = await params;
  return (
    <GhostLoader
      vodId={vodId}
      timestamp={0}
      username={decodeURIComponent(username)}
      occurrence={parseInt(occurrence, 10) || 1}
    />
  );
}
