import type { Metadata } from "next";

export const revalidate = 86400; // 1 day

type Props = {
  params: Promise<{ streamer: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer } = await params;
  const name = decodeURIComponent(streamer);
  return {
    title: `${name} - Ghost Track Record`,
    description: `Browse all ghost matchups for ${name} on BazaarGhost.`,
  };
}

export default function StreamerProfilePage() {
  return null;
}
