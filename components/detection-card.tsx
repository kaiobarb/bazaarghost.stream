"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Copy, RotateCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTwitchPlayer } from "@/hooks/useTwitchPlayer";
import { secondsToTwitchTimestamp } from "@/lib/utils";
import type { Database } from "@/types/supabase";

// Union type for both search result types
type DetectionResult =
  | Database["public"]["Functions"]["fuzzy_search_detections"]["Returns"][number]
  | Database["public"]["Functions"]["get_top_streamers_with_recent_detections"]["Returns"][number];

interface DetectionCardProps {
  result: DetectionResult;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  isFirstResult?: boolean;
}

export function DetectionCard({
  result,
  expandedId,
  onToggleExpand,
  isFirstResult = false,
}: DetectionCardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const containerId = `player-${result.detection_id}`;
  const isExpanded = expandedId === result.detection_id;

  // Only render player for first result (preload) or when expanded
  const shouldRenderPlayer = isFirstResult || isExpanded;

  // Use the Twitch Player API hook
  const { isReady, play, pause, seek, error } = useTwitchPlayer({
    containerId,
    videoId: result.vod_source_id,
    timestamp: result.frame_time_seconds || 0,
    autoplay: false, // We'll control playback manually
    shouldRender: shouldRenderPlayer && !!result.vod_source_id,
    refreshKey, // Pass refresh key to force re-initialization
  });

  // Control playback based on expansion state
  useEffect(() => {
    if (!isReady) return;

    if (isExpanded) {
      // Card is expanded - play the video
      setTimeout(() => play(), 199);
    } else {
      // Card is collapsed - pause the video
      pause();
    }
  }, [isReady, isExpanded, play, pause]);

  // Special handling for preloaded results - seek to timestamp and pause if not expanded
  useEffect(() => {
    if (!isReady || !isFirstResult) return;

    // Preloaded result: seek to timestamp immediately so it's ready when expanded
    if (result.frame_time_seconds !== undefined) {
      seek(result.frame_time_seconds);
    }

    // If preloaded but not expanded, pause it immediately
    if (!isExpanded) {
      pause();
    }
  }, [isReady, isFirstResult, isExpanded, result.frame_time_seconds, seek, pause]);

  return (
    <div
      key={result.detection_id}
      className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
    >
      <button
        onClick={() => onToggleExpand(result.detection_id)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/50"
      >
        <Avatar className="size-10 shrink-0">
          <AvatarImage
            src={result.streamer_avatar || "/placeholder.svg"}
            alt={result.streamer_display_name}
          />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {result.streamer_display_name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Mobile-responsive content layout */}
        <div className="flex flex-col md:flex-row w-full md:items-center">
          <div className="flex md:flex-1 gap-1 text-foreground">
            <span className="font-medium font-inter">
              {result.streamer_display_name}
            </span>
            <span className="text-muted-foreground"> vs </span>
            {result.rank && (
              <Image
                src={`/${result.rank.toLowerCase()}.webp`}
                alt={result.rank}
                width={32}
                height={32}
                className="inline-block"
              />
            )}
            <span className="font-medium font-inter">{result.username}</span>
          </div>

          {/* Mobile-responsive metadata */}
          <div className="md:items-end flex shrink-0 flex-row md:flex-col gap-3 md:gap-1">
            <div className="shrink-0 text-sm text-muted-foreground">
              {new Date(result.actual_timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            {result.confidence && (
              <div className="text-sm md:text-xs text-muted-foreground">
                {Math.round(result.confidence * 100)}% confidence
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded VOD Embed */}
      {/* Render player for first result (preload) or when expanded */}
      {shouldRenderPlayer &&
        result.vod_source_id &&
        result.frame_time_seconds !== undefined && (
          <div
            className={
              isExpanded
                ? "border-t border-border md:p-4"
                : isFirstResult
                  ? "hidden"
                  : ""
            }
          >
            {isExpanded && (
              <div className="mt-4 md:mt-0 mb-4 md:mb-2 ml-4 md:ml-0 flex items-center justify-between">
                <div className="flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Seek to the original timestamp
                      if (result.frame_time_seconds !== undefined) {
                        seek(result.frame_time_seconds);
                      }
                    }}
                    className="text-foreground rounded-r-none border-r-0 p-6 md:p-4"
                    aria-label="Jump to the exact moment of the matchup in the video"
                  >
                    Go to Timestamp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Copy Twitch VOD URL at timestamp to clipboard
                      if (result.frame_time_seconds !== undefined) {
                        const timeString = secondsToTwitchTimestamp(
                          result.frame_time_seconds
                        );
                        const url = `https://www.twitch.tv/videos/${result.vod_source_id}?t=${timeString}`;
                        navigator.clipboard.writeText(url);
                      }
                    }}
                    className="text-foreground rounded-l-none p-6 md:px-4 md:py-4"
                    title="Copy link at timestamp"
                    aria-label="Copy Twitch VOD link at this timestamp to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Increment refresh key to force hook re-initialization
                    setRefreshKey(prev => prev + 1);
                  }}
                  className="text-muted-foreground hover:text-foreground p-2 mr-4 md:mr-0"
                  title="Refresh player"
                  aria-label="Refresh the video player if it's not loading properly"
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="aspect-video w-full rounded-md overflow-hidden">
              {/* Twitch Embed container */}
              <div id={containerId} className="w-full h-full" />
              {error && (
                <div className="p-4 text-red-500">
                  Error loading player: {error}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
