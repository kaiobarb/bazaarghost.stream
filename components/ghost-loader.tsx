"use client";

import { useEffect, useRef } from "react";
import { useEmbed } from "@/components/embed-provider";
import { supabase } from "@/lib/supabase-client";

interface GhostLoaderProps {
  /** The Twitch VOD source ID to play */
  vodId: string;
  /** Timestamp in seconds to seek to (0 for start of VOD) */
  timestamp: number;
  /** Optional: ghost username for looking up the exact timestamp from DB */
  username?: string;
  /** Optional: occurrence index (1-based) for duplicate usernames in same VOD */
  occurrence?: number;
}

/**
 * Thin client component that drives the embed player from route params.
 * Renders nothing visible — it's a side-effect component that calls
 * `setEmbed()` on mount to load the specified VOD/ghost in the embed.
 */
export function GhostLoader({
  vodId,
  timestamp,
  username,
  occurrence = 1,
}: GhostLoaderProps) {
  const { setEmbed, videoId: currentVideoId } = useEmbed();
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    // Build a stable key to avoid re-loading the same ghost
    const key = `${vodId}|${username ?? ""}|${occurrence}|${timestamp}`;
    if (loadedRef.current === key) return;
    loadedRef.current = key;

    const load = async () => {
      let seekTime = timestamp;

      // If we have a username, look up the actual frame_time_seconds from DB
      if (username) {
        const { data } = await supabase
          .from("detection_search")
          .select("frame_time_seconds, username")
          .eq("vod_source_id", vodId)
          .ilike("username", username)
          .order("frame_time_seconds", { ascending: true });

        if (data && data.length > 0) {
          // Pick the nth occurrence (1-based)
          const idx = Math.min(occurrence - 1, data.length - 1);
          seekTime = data[idx].frame_time_seconds ?? timestamp;
        }
      }

      setEmbed(vodId, seekTime);
    };

    load();
  }, [vodId, timestamp, username, occurrence, setEmbed]);

  // Renders nothing — this is a side-effect-only component
  return null;
}
