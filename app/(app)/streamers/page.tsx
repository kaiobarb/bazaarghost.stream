import type { Metadata } from "next";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Search Streamers",
  description: "Browse and search tracked Bazaar streamers on BazaarGhost.",
};

export default function StreamersPage() {
  return null;
}
