import { Ghost, Video, Users } from "lucide-react";
import type { SearchMode } from "./types";

/**
 * Number of items fetched per batch during infinite scroll.
 *
 * Both ghost and VOD searches use this as `result_limit` / range size.
 */
export const FETCH_SIZE = 50;

/**
 * Configuration for the search mode tab bar.
 *
 * Each entry maps a {@link SearchMode} to its display label, icon, and the
 * base route the tab navigates to.  The tabs are only rendered when the
 * `showSearchTabs` feature flag is enabled.
 */
export const modeOptions: {
  value: SearchMode;
  label: string;
  icon: typeof Ghost;
  href: string;
}[] = [
  { value: "ghosts", label: "Ghosts", icon: Ghost, href: "/search" },
  { value: "vods", label: "VODs", icon: Video, href: "/vods" },
  { value: "streamers", label: "Streamers", icon: Users, href: "/streamers" },
];
