import type { Metadata } from "next";
import { GhostLoader } from "@/components/ghost-loader";

export const revalidate = 86400; // 1 day

type Props = {
  params: Promise<{ streamer: string; username: string; vodId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer, username, vodId } = await params;
  const streamerName = decodeURIComponent(streamer);
  const ghostName = decodeURIComponent(username);
  return {
    title: `${streamerName} vs ${ghostName}`,
    description: `Watch ${streamerName} vs ${ghostName} in The Bazaar — VOD ${vodId} on BazaarGhost.`,
    openGraph: {
      title: `${streamerName} vs ${ghostName} — BazaarGhost`,
      description: `Watch this ghost matchup from ${streamerName}'s stream on BazaarGhost.`,
      type: "website",
    },
  };
}

export default async function GhostMatchPage({ params }: Props) {
  const { username, vodId } = await params;
  return (
    <GhostLoader
      vodId={vodId}
      timestamp={0}
      username={decodeURIComponent(username)}
    />
  );
}
