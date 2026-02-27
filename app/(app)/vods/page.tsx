import type { Metadata } from "next";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Search VODs",
  description: "Browse and search Bazaar Twitch VODs tracked by BazaarGhost.",
};

export default function VodsPage() {
  return null;
}
