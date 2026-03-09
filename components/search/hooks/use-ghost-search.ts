"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { GhostResult } from "@/components/ghost-result-row";
import { FETCH_SIZE } from "../constants";

/**
 * Return type for {@link useGhostSearch}.
 */
export interface UseGhostSearchReturn {
  ghostResults: GhostResult[];
  totalResults: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreGhosts: boolean;
  loadMoreGhosts: () => void;
}

/**
 * Manages ghost search state with infinite scroll.
 *
 * Calls the `fuzzy_search_detections` Supabase RPC with the current query,
 * streamer, and VOD filters.  Automatically re-fetches when filter params
 * change (deduplicated via a search key ref).  Exposes a `loadMoreGhosts`
 * callback that appends the next batch at the current offset.
 *
 * @param params.queryParam   - The `?q=` search text.
 * @param params.streamerId   - Numeric streamer ID filter (or `null`).
 * @param params.effectiveVod - VOD source ID filter (or `null`).
 * @param params.enabled      - Set to `true` only when in ghost search mode.
 */
export function useGhostSearch({
  queryParam,
  streamerId,
  effectiveVod,
  enabled,
}: {
  queryParam: string;
  streamerId: number | null;
  effectiveVod: string | null;
  /** Only fetch when in ghost search mode */
  enabled: boolean;
}): UseGhostSearchReturn {
  const [ghostResults, setGhostResults] = useState<GhostResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreGhosts, setHasMoreGhosts] = useState(true);
  const ghostOffsetRef = useRef(0);
  const prevSearchKey = useRef<string>("");

  /**
   * Fetch a batch of ghost results from the `fuzzy_search_detections` RPC.
   *
   * When `append` is false, resets the offset and replaces results (initial fetch).
   * When `append` is true, fetches from the current offset and concatenates.
   * Uses `total_count` from the first row (if available) to determine `hasMore`.
   */
  const fetchGhosts = useCallback(
    async (
      query: string,
      sid: number | null,
      vodSourceId: string | null,
      append: boolean
    ) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        ghostOffsetRef.current = 0;
      }

      try {
        const offset = append ? ghostOffsetRef.current : 0;
        const rpcParams: Record<string, any> = {
          search_query: query.trim() || undefined,
          similarity_threshold: 0.25,
          result_limit: FETCH_SIZE,
          result_offset: offset,
          date_range_filter: "all",
        };

        if (sid) rpcParams.streamer_id_filter = sid;
        if (vodSourceId) rpcParams.vod_source_id_filter = vodSourceId;

        const { data, error } = await supabase.rpc(
          "fuzzy_search_detections",
          rpcParams
        );

        if (error) {
          console.error("Search error:", error);
          if (!append) {
            setGhostResults([]);
            setTotalResults(0);
          }
          setHasMoreGhosts(false);
        } else if (data) {
          const newItems = data as GhostResult[];
          const firstRow = data[0] as any;
          const serverTotal =
            firstRow?.total_count != null
              ? Number(firstRow.total_count)
              : undefined;

          if (append) {
            setGhostResults((prev) => [...prev, ...newItems]);
          } else {
            setGhostResults(newItems);
          }

          const newOffset = offset + newItems.length;
          ghostOffsetRef.current = newOffset;

          if (serverTotal != null) {
            setTotalResults(serverTotal);
            setHasMoreGhosts(newOffset < serverTotal);
          } else {
            setTotalResults(newOffset);
            setHasMoreGhosts(newItems.length >= FETCH_SIZE);
          }
        }
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // ---- Trigger search when params change (initial fetch) ----
  useEffect(() => {
    if (!enabled) return;

    const searchKey = `ghosts|${queryParam}|${streamerId ?? ""}|${effectiveVod ?? ""}`;
    if (searchKey === prevSearchKey.current) return;
    prevSearchKey.current = searchKey;

    setHasMoreGhosts(true);
    fetchGhosts(queryParam, streamerId, effectiveVod, false);
  }, [enabled, queryParam, streamerId, effectiveVod, fetchGhosts]);

  /** Append the next batch of results. Guarded against concurrent calls. */
  const loadMoreGhosts = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMoreGhosts) return;
    fetchGhosts(queryParam, streamerId, effectiveVod, true);
  }, [
    isLoading,
    isLoadingMore,
    hasMoreGhosts,
    fetchGhosts,
    queryParam,
    streamerId,
    effectiveVod,
  ]);

  return {
    ghostResults,
    totalResults,
    isLoading,
    isLoadingMore,
    hasMoreGhosts,
    loadMoreGhosts,
  };
}
