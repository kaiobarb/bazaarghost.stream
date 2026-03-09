import type { Metadata } from "next";

/** Revalidate streamer pages once per hour. */
export const revalidate = 3600;

type Props = {
  params: Promise<{ streamer: string }>;
};

/**
 * Generate metadata for the streamer overview page.
 *
 * Uses the URL param directly (no DB call yet). Display-name casing comes
 * from the URL as-authored by the linking page.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamer } = await params;
  const name = decodeURIComponent(streamer);
  return {
    title: `${name} - Ghost Track Record`,
    description: `Browse all ghost matchups for ${name} on BazaarGhost.`,
  };
}

/**
 * Streamer overview page at `/:streamer`.
 *
 * Currently renders nothing — the search panel in the layout drives the UI.
 * The route exists for:
 * - Shareable links (e.g. `bazaarghost.stream/Ikarus_`)
 * - SEO / metadata
 * - Future: server-fetched streamer stats in the right panel
 */
export default function StreamerPage() {
  return null;
}
