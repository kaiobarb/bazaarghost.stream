import type { Metadata } from "next";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Search Ghosts",
  description:
    "Search for ghost matchups across thousands of Twitch VODs from The Bazaar streamers.",
};

export default function SearchPage() {
  return null;
}
