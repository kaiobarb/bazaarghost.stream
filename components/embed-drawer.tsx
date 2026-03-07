"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Pause, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmbedPanel } from "@/components/embed-panel";
import { useEmbed } from "@/components/embed-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Mobile-only bottom sheet for the Twitch embed.
 *
 * The EmbedPanel (and its Twitch iframe) is always mounted in the DOM —
 * never inside a portal — so the player is never destroyed on open/close.
 * Visibility is controlled purely with CSS transforms.
 *
 * `headerHeight` is the measured height of the search header so the sheet
 * stops just below it, keeping the search bar interactive while watching.
 */

interface EmbedDrawerProps {
  /** Pixel height of the search header bar. The sheet will not cover it. */
  headerHeight?: number;
}

export function EmbedDrawer({ headerHeight = 0 }: EmbedDrawerProps) {
  const {
    isVisible,
    videoId,
    timestamp,
    meta,
    isPaused,
    pause,
    play,
    togglePlay,
    ghosts,
    currentTime,
  } = useEmbed();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Derive current ghost from playback position
  const currentGhostName = useMemo(() => {
    if (ghosts.length === 0) return null;
    const sorted = [...ghosts].sort(
      (a, b) => a.frame_time_seconds - b.frame_time_seconds
    );
    let name: string | null = null;
    for (const g of sorted) {
      if (g.frame_time_seconds <= currentTime) {
        name = g.username;
      } else {
        break;
      }
    }
    return name;
  }, [ghosts, currentTime]);

  // Open the sheet when a new ghost/vod is selected.
  // Close when explicitly dismissed via the X button.
  const prevVideoId = useRef(videoId);
  const prevTimestamp = useRef(timestamp);
  useEffect(() => {
    if (!isVisible) {
      setSheetOpen(false);
    } else if (
      videoId !== prevVideoId.current ||
      timestamp !== prevTimestamp.current
    ) {
      setSheetOpen(true);
    }
    prevVideoId.current = videoId;
    prevTimestamp.current = timestamp;
  }, [isVisible, videoId, timestamp]);

  const handleClose = useCallback(() => {
    pause();
    setSheetOpen(false);
  }, [pause]);

  const handleReopen = useCallback(() => {
    setSheetOpen(true);
    play();
  }, [play]);

  // Nothing loaded at all — render nothing
  if (!isVisible || !videoId) return null;

  return (
    <>
      {/* Persistent bottom bar — visible when sheet is closed */}
      {!sheetOpen && (
        <button
          type="button"
          onClick={handleReopen}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-card px-4 py-3 text-left md:hidden"
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {isPaused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
          </Button>
          {meta?.streamerAvatar && (
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={meta.streamerAvatar} alt={meta.streamerName} />
              <AvatarFallback className="bg-primary text-[9px] text-primary-foreground">
                {meta.streamerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {meta?.streamerName ?? `Video ${videoId}`}
              {currentGhostName && (
                <span className="text-muted-foreground">
                  {" "}
                  vs <span className="text-foreground">{currentGhostName}</span>
                </span>
              )}
            </p>
            {meta?.vodTitle && (
              <p className="truncate text-xs text-muted-foreground">
                {meta.vodTitle}
              </p>
            )}
          </div>
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* Scrim overlay — starts below the search header so it stays interactive */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
          sheetOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        style={{ top: headerHeight }}
        onClick={handleClose}
      />

      {/* Bottom sheet — slides up to just below the search header */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-border bg-card transition-transform duration-300 ease-out md:hidden",
          sheetOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: `calc(100svh - ${headerHeight}px)` }}
      >
        {/* Drag handle */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="flex w-full justify-center py-2" onClick={handleClose}>
          <div className="h-1.5 w-10 rounded-full bg-muted" />
        </div>

        {/* Embed content — always in DOM */}
        <div className="flex-1 overflow-y-auto">
          <EmbedPanel />
        </div>
      </div>
    </>
  );
}
