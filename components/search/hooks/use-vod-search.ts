"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { VodResult } from "@/components/results";
import type { StreamerOption } from "../types";
import { FETCH_SIZE } from "../constants";

/**
 * Return type for {@link useVodSearch}.
 */
export interface UseVodSearchReturn {
  vodResults: VodResult[];
  totalResults: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreVods: boolean;
  loadMoreVods: () => void;
}

/**
 * Manages VOD search state with infinite scroll.
 *
 * Queries the `vod_stats` Supabase view filtered by availability, streamer,
 * and title/source-ID text match.  Deduplicates results both within a batch
 * and across batches (the view can return duplicate `source_id` rows).
 *
 * @param params.queryParam          - The `?q=` search text.
 * @param params.streamerDisplayName - Streamer display name filter (or `null`).
 * @param params.streamerOptions     - Full streamer list, used for avatar/login resolution.
 * @param params.enabled             - Set to `true` only when in VOD search mode.
 */
export function useVodSearch({
  queryParam,
  streamerDisplayName,
  streamerOptions,
  enabled,
}: {
  queryParam: string;
  streamerDisplayName: string | null;
  /** Needed for avatar/login resolution when mapping VOD rows */
  streamerOptions: StreamerOption[];
  /** Only fetch when in VOD search mode */
  enabled: boolean;
}): UseVodSearchReturn {
  const [vodResults, setVodResults] = useState<VodResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreVods, setHasMoreVods] = useState(true);
  const vodOffsetRef = useRef(0);
  const prevSearchKey = useRef<string>("");

  /**
   * Fetch a batch of VOD results from the `vod_stats` view.
   *
   * When `append` is false, resets the offset and replaces results.
   * When `append` is true, fetches from the current offset and appends,
   * deduplicating against already-loaded `source_id` values.
   */
  const fetchVods = useCallback(
    async (query: string, displayName: string | null, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        vodOffsetRef.current = 0;
      }

      try {
        const offset = append ? vodOffsetRef.current : 0;

        let q = supabase
          .from("vod_stats")
          .select("*", { count: "exact" })
          .eq("availability", "available")
          .order("published_at", { ascending: false })
          .range(offset, offset + FETCH_SIZE - 1);

        if (displayName) {
          q = q.eq("streamer", displayName);
        }

        const trimmed = query.trim();
        if (trimmed) {
          q = q.or(`title.ilike.%${trimmed}%,source_id.ilike.%${trimmed}%`);
        }

        q = q.gt("total_detections", 0);

        const { data, count, error } = await q;

        if (error) {
          console.error("VOD search error:", error);
          if (!append) {
            setVodResults([]);
            setTotalResults(0);
          }
          setHasMoreVods(false);
        } else if (data) {
          const streamerByName = new Map(
            streamerOptions.map((s) => [s.streamer_display_name, s])
          );

          const seen = new Set<string>();
          const mapped: VodResult[] = data
            .filter((v) => v.source_id && v.title)
            .filter((v) => {
              // Deduplicate — vod_stats view can return multiple rows per source_id
              if (seen.has(v.source_id!)) return false;
              seen.add(v.source_id!);
              return true;
            })
            .map((v) => {
              const s = streamerByName.get(v.streamer ?? "");
              return {
                vod_id: v.id ?? 0,
                vod_source_id: v.source_id!,
                title: v.title!,
                published_at: v.published_at ?? "",
                duration_seconds: v.duration_seconds ?? 0,
                streamer_id: s?.streamer_id ?? 0,
                streamer_display_name: v.streamer ?? "",
                streamer_avatar: s?.streamer_avatar ?? "",
                streamer_login: s?.streamer_login ?? "",
                ghost_count: v.total_detections ?? 0,
              };
            });

          if (append) {
            setVodResults((prev) => {
              const existing = new Set(prev.map((v) => v.vod_source_id));
              return [
                ...prev,
                ...mapped.filter((v) => !existing.has(v.vod_source_id)),
              ];
            });
          } else {
            setVodResults(mapped);
          }

          const serverTotal = count ?? 0;
          const newOffset = offset + mapped.length;
          vodOffsetRef.current = newOffset;
          setTotalResults(serverTotal);
          setHasMoreVods(newOffset < serverTotal);
        }
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [streamerOptions]
  );

  // ---- Trigger search when params change (initial fetch) ----
  useEffect(() => {
    if (!enabled) return;

    const searchKey = `vods|${queryParam}|${streamerDisplayName ?? ""}`;
    if (searchKey === prevSearchKey.current) return;
    prevSearchKey.current = searchKey;

    setHasMoreVods(true);
    fetchVods(queryParam, streamerDisplayName, false);
  }, [enabled, queryParam, streamerDisplayName, fetchVods]);

  /** Append the next batch of results. Guarded against concurrent calls. */
  const loadMoreVods = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMoreVods) return;
    fetchVods(queryParam, streamerDisplayName, true);
  }, [
    isLoading,
    isLoadingMore,
    hasMoreVods,
    fetchVods,
    queryParam,
    streamerDisplayName,
  ]);

  return {
    vodResults,
    totalResults,
    isLoading,
    isLoadingMore,
    hasMoreVods,
    loadMoreVods,
  };
}
