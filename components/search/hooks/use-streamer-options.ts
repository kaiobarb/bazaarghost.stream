"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import type { StreamerOption, ResolvedStreamer, SearchMode } from "../types";

/**
 * Return type for {@link useStreamerOptions}.
 */
export interface UseStreamerOptionsReturn {
  /** All streamer options from DB */
  streamerOptions: StreamerOption[];
  /** The resolved streamer matching the effective filter */
  resolvedStreamer: ResolvedStreamer | null;
  /** Client-side filtered streamers (for "streamers" search mode) */
  filteredStreamers: StreamerOption[];
  /** Whether the streamer popover is open */
  openStreamerPopover: boolean;
  /** Toggle the streamer popover */
  setOpenStreamerPopover: (open: boolean) => void;
  /** Select a streamer (or null for "any") from the popover */
  handleSelectStreamer: (opt: StreamerOption | null) => void;
}

/**
 * Fetches the full streamer list on mount, resolves the currently-active
 * streamer filter, and provides client-side filtering for "streamers" mode.
 *
 * Also owns the streamer-picker popover open/close state and the selection
 * handler (which updates the URL via `replaceParams`).
 *
 * @param params.effectiveStreamer - The streamer name or ID derived from the URL.
 * @param params.searchMode       - The active search tab.
 * @param params.queryParam       - The current `?q=` value (used for client-side filtering).
 * @param params.replaceParams    - URL mutation helper from {@link useSearchUrl}.
 * @param params.routePathStreamer - Streamer implied by the URL path (if any).
 */
export function useStreamerOptions({
  effectiveStreamer,
  searchMode,
  queryParam,
  replaceParams,
  routePathStreamer,
}: {
  effectiveStreamer: string | null;
  searchMode: SearchMode;
  queryParam: string;
  replaceParams: (overrides: Record<string, string | null | undefined>) => void;
  routePathStreamer: string | null;
}): UseStreamerOptionsReturn {
  const router = useRouter();
  const [streamerOptions, setStreamerOptions] = useState<StreamerOption[]>([]);
  const [openStreamerPopover, setOpenStreamerPopover] = useState(false);

  // ---- Fetch streamer options on mount ----
  useEffect(() => {
    const fetchStreamers = async () => {
      const { data } = await supabase
        .from("streamers_with_detections")
        .select("*")
        .order("streamer_display_name", { ascending: true });
      if (data) setStreamerOptions(data);
    };
    fetchStreamers();
  }, []);

  /**
   * Resolve the `effectiveStreamer` string into a {@link ResolvedStreamer}
   * by matching against the fetched streamer list (by display name first,
   * then by numeric ID as a fallback).
   */
  const resolvedStreamer = useMemo((): ResolvedStreamer | null => {
    if (!effectiveStreamer) return null;
    // Try matching by display_name (path uses display_name)
    const byName = streamerOptions.find(
      (s) =>
        (s.streamer_display_name ?? "").toLowerCase() ===
        effectiveStreamer.toLowerCase()
    );
    if (byName)
      return {
        id: byName.streamer_id,
        displayName: byName.streamer_display_name ?? "",
        avatar: byName.streamer_avatar ?? "",
      };
    // Try matching by id (param might be an id)
    const byId = streamerOptions.find(
      (s) => String(s.streamer_id) === effectiveStreamer
    );
    if (byId)
      return {
        id: byId.streamer_id,
        displayName: byId.streamer_display_name ?? "",
        avatar: byId.streamer_avatar ?? "",
      };
    return null;
  }, [effectiveStreamer, streamerOptions]);

  /**
   * Client-side filter of the streamer list for the "streamers" search tab.
   * Matches against display name and login, sorted by detection count descending.
   * Returns an empty array when not in streamers mode.
   */
  const filteredStreamers = useMemo(() => {
    if (searchMode !== "streamers") return [];
    const q = queryParam.trim().toLowerCase();
    let list = streamerOptions;
    if (q) {
      list = list.filter(
        (s) =>
          (s.streamer_display_name ?? "").toLowerCase().includes(q) ||
          (s.streamer_login ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort(
      (a, b) => (b.detection_count ?? 0) - (a.detection_count ?? 0)
    );
  }, [streamerOptions, queryParam, searchMode]);

  /**
   * Handle a streamer selection from the picker popover.
   *
   * When a streamer is selected, updates `?streamer=` in the URL.
   * When cleared (`null`), navigates to `/search` if the current path
   * implies a streamer (to escape the path-based filter context).
   */
  const handleSelectStreamer = useCallback(
    (opt: StreamerOption | null) => {
      setOpenStreamerPopover(false);
      if (opt) {
        replaceParams({
          streamer: opt.streamer_display_name ?? String(opt.streamer_id),
        });
      } else {
        // "Any streamer" selected — if on a /:streamer route, the path
        // implies a streamer. Navigate to /search to escape the path context.
        if (routePathStreamer) {
          const params = new URLSearchParams();
          if (queryParam) params.set("q", queryParam);
          const qs = params.toString();
          router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
        } else {
          replaceParams({ streamer: null });
        }
      }
    },
    [replaceParams, routePathStreamer, queryParam, router]
  );

  return {
    streamerOptions,
    resolvedStreamer,
    filteredStreamers,
    openStreamerPopover,
    setOpenStreamerPopover,
    handleSelectStreamer,
  };
}
