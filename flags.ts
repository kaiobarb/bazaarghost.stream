import { flag } from "flags/next";

/**
 * When enabled, VODs and Streamers tabs are shown in the search panel.
 * Disabled in production until those modes are fully designed.
 */
export const showSearchTabs = flag<boolean>({
  key: "search-tabs",
  defaultValue: false,
  description: "Show VODs and Streamers tabs in the search panel",
  decide() {
    // Off by default — use Flags Explorer override to enable per-session
    return false;
  },
  options: [
    { value: true, label: "Show" },
    { value: false, label: "Hide" },
  ],
});
