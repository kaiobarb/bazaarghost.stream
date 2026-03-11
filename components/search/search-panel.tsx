"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEmbed } from "@/components/embed";
import { usePanelControls } from "./panel-context";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GhostResult, VodResult } from "@/components/results";

import { useSearchUrl } from "./hooks/use-search-url";
import { useStreamerOptions } from "./hooks/use-streamer-options";
import { useGhostSearch } from "./hooks/use-ghost-search";
import { useVodSearch } from "./hooks/use-vod-search";

import { SearchResults } from "./search-results";
import { DesktopLayout } from "./desktop-layout";
import { MobileLayout } from "./mobile-layout";

/**
 * Search panel orchestrator — results and layout only.
 *
 * The search header (input + streamer picker + tabs) is rendered in the
 * root layout via {@link GlobalSearchHeader}. This component owns the
 * search result hooks and delegates to {@link DesktopLayout} or
 * {@link MobileLayout} for presentation.
 */
export default function SearchPanel() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    isVisible: embedVisible,
    videoId: activeVideoId,
    currentTime: activeTime,
    setEmbed,
    setActiveGhost,
  } = useEmbed();
  const { expandEmbed, isEmbedCollapsed } = usePanelControls();

  // ---- URL state ----
  const {
    searchMode,
    routeContext,
    queryParam,
    effectiveStreamer,
    effectiveVod,
    searchParamsString,
    replaceParams,
  } = useSearchUrl();

  // ---- Streamer options (needed for filtered streamers list) ----
  const { resolvedStreamer, filteredStreamers } = useStreamerOptions({
    effectiveStreamer,
    searchMode,
    queryParam,
    replaceParams,
    routePathStreamer: routeContext.pathStreamer,
  });

  // ---- Ghost search ----
  const {
    ghostResults,
    totalResults: ghostTotalResults,
    isLoading: isGhostLoading,
    isLoadingMore: isGhostLoadingMore,
    hasMoreGhosts,
    loadMoreGhosts,
  } = useGhostSearch({
    queryParam,
    streamerId: resolvedStreamer?.id ?? null,
    effectiveVod,
    enabled: searchMode === "ghosts",
  });

  // ---- VOD search ----
  const {
    vodResults,
    totalResults: vodTotalResults,
    isLoading: isVodLoading,
    isLoadingMore: isVodLoadingMore,
    hasMoreVods,
    loadMoreVods,
  } = useVodSearch({
    queryParam,
    streamerDisplayName: resolvedStreamer?.displayName ?? null,
    streamerOptions: filteredStreamers,
    enabled: searchMode === "vods",
  });

  /** Navigate to a streamer's page at `/:name`. */
  const handleNavigateToStreamer = useCallback(
    (_streamerId: number, name: string) => {
      router.push(`/${encodeURIComponent(name)}`, { scroll: false });
    },
    [router]
  );

  /** Add a `?vod=` filter to show ghosts for a specific VOD. */
  const handleNavigateToVodGhosts = useCallback(
    (vodSourceId: string, _title: string) => {
      replaceParams({ vod: vodSourceId });
    },
    [replaceParams]
  );

  /** Navigate to the VOD embed route at `/:name/:vodId`. */
  const handleVodClick = useCallback(
    (vod: VodResult) => {
      const path = `/${encodeURIComponent(vod.streamer_display_name)}/${vod.vod_source_id}`;
      router.push(path, { scroll: false });
    },
    [router]
  );

  /** Navigate to a streamer's page (used from the streamers result list). */
  const handleStreamerClick = useCallback(
    (_streamerId: number, name: string) => {
      router.push(`/${encodeURIComponent(name)}`, { scroll: false });
    },
    [router]
  );

  /** Play a ghost matchup: set embed, navigate, and expand the panel. */
  const handleGhostPlay = useCallback(
    (ghost: GhostResult) => {
      setActiveGhost({
        detection_id: ghost.detection_id,
        username: ghost.username,
        rank: ghost.rank,
        frame_time_seconds: ghost.frame_time_seconds,
      });

      const basePath = `/${encodeURIComponent(ghost.streamer_display_name)}/${ghost.vod_source_id}/${encodeURIComponent(ghost.username)}`;
      router.push(
        searchParamsString ? `${basePath}?${searchParamsString}` : basePath,
        { scroll: false }
      );

      const date = new Date(ghost.actual_timestamp).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      );
      setEmbed(ghost.vod_source_id, ghost.frame_time_seconds, {
        streamerName: ghost.streamer_display_name,
        streamerAvatar: ghost.streamer_avatar,
        vodTitle: `Video ${ghost.vod_source_id}`,
        date,
      });

      if (isEmbedCollapsed()) {
        expandEmbed();
      }
    },
    [
      router,
      searchParamsString,
      setActiveGhost,
      setEmbed,
      expandEmbed,
      isEmbedCollapsed,
    ]
  );

  // ---- Shared UI elements ----
  const searchResults = (
    <SearchResults
      searchMode={searchMode}
      queryParam={queryParam}
      ghostResults={ghostResults}
      ghostTotalResults={ghostTotalResults}
      isGhostLoading={isGhostLoading}
      isGhostLoadingMore={isGhostLoadingMore}
      hasMoreGhosts={hasMoreGhosts}
      loadMoreGhosts={loadMoreGhosts}
      activeVideoId={activeVideoId}
      activeTime={activeTime}
      vodResults={vodResults}
      vodTotalResults={vodTotalResults}
      isVodLoading={isVodLoading}
      isVodLoadingMore={isVodLoadingMore}
      hasMoreVods={hasMoreVods}
      loadMoreVods={loadMoreVods}
      filteredStreamers={filteredStreamers}
      onGhostPlay={handleGhostPlay}
      onNavigateToStreamer={handleNavigateToStreamer}
      onNavigateToVodGhosts={handleNavigateToVodGhosts}
      onVodClick={handleVodClick}
      onStreamerClick={handleStreamerClick}
    />
  );

  // ---- Layout branching ----
  if (isMobile) {
    return <MobileLayout searchResults={searchResults} />;
  }

  return (
    <DesktopLayout searchResults={searchResults} embedVisible={embedVisible} />
  );
}
