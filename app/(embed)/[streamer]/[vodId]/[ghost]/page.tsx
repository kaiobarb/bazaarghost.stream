import type { Metadata } from "next";
import { GhostLoader } from "@/components/embed";

/** Revalidate ghost matchup pages once per day — detection data is immutable. */
export const revalidate = 86400;

type Props = {
  params: Promise<{ streamer: string; vodId: string; ghost: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Generate metadata for a specific ghost matchup page.
 *
 * Produces "Streamer vs Ghost" titles and OpenGraph tags for rich
 * previews in Discord, Slack, Twitter, etc.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer, ghost } = await params;
  const streamerName = decodeURIComponent(streamer);
  const ghostName = decodeURIComponent(ghost);
  return {
    title: `${streamerName} vs ${ghostName}`,
    description: `Watch ${streamerName} vs ${ghostName} in The Bazaar on BazaarGhost.`,
    openGraph: {
      title: `${streamerName} vs ${ghostName} — BazaarGhost`,
      description: `Watch this ghost matchup from ${streamerName}'s stream on BazaarGhost.`,
      type: "website",
    },
  };
}

/**
 * Ghost matchup page at `/:streamer/:vodId/:ghost`.
 *
 * Loads the Twitch player and seeks to the ghost's timestamp in the VOD.
 * Supports an optional `?t=` query param for occurrence index (1-based)
 * when a ghost appears multiple times in the same VOD.
 */
export default async function GhostMatchPage({ params, searchParams }: Props) {
  const { vodId, ghost } = await params;
  const { t } = await searchParams;
  const occurrence = typeof t === "string" ? parseInt(t, 10) || 1 : 1;
  const username = decodeURIComponent(ghost);

  return (
    <GhostLoader
      vodId={vodId}
      timestamp={0}
      username={username}
      occurrence={occurrence}
    />
  );
}
