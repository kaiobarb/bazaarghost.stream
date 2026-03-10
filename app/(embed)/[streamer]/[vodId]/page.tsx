import type { Metadata } from "next";
import { GhostLoader } from "@/components/embed";

/** Revalidate VOD pages once per day — VOD data is essentially immutable. */
export const revalidate = 86400;

type Props = {
  params: Promise<{ streamer: string; vodId: string }>;
};

/**
 * Generate metadata for the VOD ghost matchups page.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer, vodId } = await params;
  const name = decodeURIComponent(streamer);
  return {
    title: `${name} - VOD ${vodId}`,
    description: `Watch ${name}'s VOD ${vodId} and browse ghost matchups on BazaarGhost.`,
  };
}

/**
 * VOD embed page at `/:streamer/:vodId`.
 *
 * Loads the Twitch player for the given VOD at timestamp 0 (start of VOD).
 * The search panel filters to show ghosts in this VOD.
 */
export default async function VodPage({ params }: Props) {
  const { vodId } = await params;
  return <GhostLoader vodId={vodId} timestamp={0} />;
}
