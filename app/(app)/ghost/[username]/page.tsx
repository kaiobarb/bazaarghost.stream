import type { Metadata } from "next";

/** Revalidate ghost profile pages once per hour. */
export const revalidate = 3600;

type Props = {
  params: Promise<{ username: string }>;
};

/**
 * Generate metadata for a ghost's profile / history page.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const name = decodeURIComponent(username);
  return {
    title: `${name} - Ghost History`,
    description: `Browse all ghost appearances by ${name} across Bazaar streamers on BazaarGhost.`,
  };
}

/**
 * Ghost profile page at `/ghost/:username`.
 *
 * Currently renders nothing — the search panel in the layout drives the UI
 * with `?q=` pre-filled. The route exists for:
 * - Shareable links (e.g. `bazaarghost.stream/ghost/nanao`)
 * - SEO / metadata
 * - Future: ghost-specific stats (total appearances, win rate, rank history)
 */
export default function GhostProfilePage() {
  return null;
}
