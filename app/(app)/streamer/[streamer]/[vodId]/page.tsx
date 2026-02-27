import type { Metadata } from "next";
import { GhostLoader } from "@/components/ghost-loader";

export const revalidate = 86400; // 1 day

type Props = {
  params: Promise<{ streamer: string; vodId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer, vodId } = await params;
  const name = decodeURIComponent(streamer);
  return {
    title: `${name} - VOD ${vodId}`,
    description: `Watch ${name}'s VOD ${vodId} and browse ghost matchups on BazaarGhost.`,
  };
}

export default async function VodEmbedPage({ params }: Props) {
  const { vodId } = await params;
  return <GhostLoader vodId={vodId} timestamp={0} />;
}
