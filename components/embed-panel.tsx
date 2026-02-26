"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Pause,
  Play,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEmbed, type EmbedGhost } from "@/components/embed-provider";
import { cn, secondsToTwitchTimestamp } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Timeline sub-component
// ---------------------------------------------------------------------------

interface EmbedTimelineProps {
  currentTime: number;
  duration: number;
  bazaarChapters: number[] | null;
  ghosts: EmbedGhost[];
  currentGhostId: string | null;
  onSeek: (seconds: number) => void;
}

function EmbedTimeline({
  currentTime,
  duration,
  bazaarChapters,
  ghosts,
  currentGhostId,
  onSeek,
}: EmbedTimelineProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || duration <= 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const fraction = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );
      onSeek(fraction * duration);
    },
    [duration, onSeek]
  );

  // Parse bazaar chapter start/end pairs from the flat array
  const segments: { start: number; end: number }[] = [];
  if (bazaarChapters && bazaarChapters.length >= 2) {
    for (let i = 0; i < bazaarChapters.length - 1; i += 2) {
      segments.push({ start: bazaarChapters[i], end: bazaarChapters[i + 1] });
    }
  }

  return (
    <div
      ref={barRef}
      onClick={handleClick}
      className="group relative h-2 w-full cursor-pointer rounded-full bg-muted"
    >
      {/* Bazaar chapter segments */}
      {segments.map((seg, i) => {
        if (duration <= 0) return null;
        const left = (seg.start / duration) * 100;
        const width = ((seg.end - seg.start) / duration) * 100;
        return (
          <div
            key={i}
            className="absolute top-0 h-full rounded-full bg-chart-3"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.5)}%`,
            }}
          />
        );
      })}

      {/* Ghost markers */}
      {ghosts.map((ghost) => {
        if (duration <= 0) return null;
        const left = (ghost.frame_time_seconds / duration) * 100;
        const isActive = ghost.detection_id === currentGhostId;
        return (
          <div
            key={ghost.detection_id}
            className="absolute top-0 h-full"
            style={{ left: `${left}%` }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "-translate-x-1/2",
                    isActive
                      ? "-mt-1.5 h-[calc(100%+12px)] w-[5px] rounded-full bg-foreground"
                      : "h-full w-0.5 bg-foreground/60"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {ghost.username}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}

      {/* Current seek position — rendered last to sit on top of everything */}
      {duration > 0 && (
        <div
          className="absolute -top-1 h-[calc(100%+8px)] w-[3px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmbedPanel
// ---------------------------------------------------------------------------

export function EmbedPanel() {
  const {
    videoId,
    timestamp,
    meta,
    isVisible,
    hideEmbed,
    containerId,
    error,
    isReady,
    isPaused,
    isMuted,
    currentTime,
    duration,
    togglePlay,
    toggleMute,
    seek,
    ghosts,
    bazaarChapters,
  } = useEmbed();

  // ---- Derived: current ghost based on playback position ----
  const sortedGhosts = useMemo(
    () =>
      [...ghosts].sort((a, b) => a.frame_time_seconds - b.frame_time_seconds),
    [ghosts]
  );

  const currentGhost = useMemo(() => {
    if (sortedGhosts.length === 0) return null;
    // Find the last ghost whose frame_time_seconds <= currentTime
    let match: EmbedGhost | null = null;
    for (const g of sortedGhosts) {
      if (g.frame_time_seconds <= currentTime) {
        match = g;
      } else {
        break;
      }
    }
    return match;
  }, [sortedGhosts, currentTime]);

  // ---- Arrow navigation: prev/next ghost ----
  const navigatePrevGhost = useCallback(() => {
    if (sortedGhosts.length === 0) return;
    // Find the ghost before current time (with a small buffer so tapping prev
    // at the exact ghost time goes to the one before it)
    const buffer = 2;
    for (let i = sortedGhosts.length - 1; i >= 0; i--) {
      if (sortedGhosts[i].frame_time_seconds < currentTime - buffer) {
        seek(sortedGhosts[i].frame_time_seconds);
        return;
      }
    }
    // If nothing before, go to first ghost
    seek(sortedGhosts[0].frame_time_seconds);
  }, [sortedGhosts, currentTime, seek]);

  const navigateNextGhost = useCallback(() => {
    if (sortedGhosts.length === 0) return;
    for (const g of sortedGhosts) {
      if (g.frame_time_seconds > currentTime + 2) {
        seek(g.frame_time_seconds);
        return;
      }
    }
    // If nothing after, go to last ghost
    seek(sortedGhosts[sortedGhosts.length - 1].frame_time_seconds);
  }, [sortedGhosts, currentTime, seek]);

  // ---- Hover state for timeline peek (debounced to survive tooltip portals) ----
  const [isHovered, setIsHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setIsHovered(false), 150);
  }, []);

  if (!isVisible || !videoId) return null;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Player area */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-black">
        <div id={containerId} className="size-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-destructive">
            Error loading player: {error}
          </div>
        )}
      </div>

      {/* Row 1: Meta + current ghost + controls — 3-col grid for true centering */}
      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-border bg-card px-3 py-2">
        {/* Left: streamer meta */}
        <div className="flex min-w-0 items-center gap-2">
          {meta && (
            <>
              <Avatar className="size-6 shrink-0">
                <AvatarImage
                  src={meta.streamerAvatar}
                  alt={meta.streamerName}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                  {meta.streamerName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs font-medium text-card-foreground">
                {meta.streamerName}
              </span>
            </>
          )}
          {!meta && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Video className="size-3" />
              <span>Video {videoId}</span>
            </div>
          )}
        </div>

        {/* Center: prev arrow + current ghost name + next arrow */}
        <div className="flex items-center justify-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
            title="Previous ghost"
            onClick={navigatePrevGhost}
            disabled={sortedGhosts.length === 0}
          >
            <ArrowLeft className="size-3.5" />
          </Button>
          {currentGhost ? (
            <button
              type="button"
              onClick={() => seek(currentGhost.frame_time_seconds)}
              className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              {currentGhost.rank && (
                <Image
                  src={`/${currentGhost.rank.toLowerCase()}.webp`}
                  alt={currentGhost.rank}
                  width={24}
                  height={24}
                  className="shrink-0"
                />
              )}
              {currentGhost.username}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">No ghost</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
            title="Next ghost"
            onClick={navigateNextGhost}
            disabled={sortedGhosts.length === 0}
          >
            <ArrowRight className="size-3.5" />
          </Button>
        </div>

        {/* Right: controls */}
        <div className="flex items-center justify-end gap-0.5">
          {/* Play / Pause */}
          {isReady && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              title={isPaused ? "Play" : "Pause"}
              onClick={togglePlay}
            >
              {isPaused ? (
                <Play className="size-3" />
              ) : (
                <Pause className="size-3" />
              )}
            </Button>
          )}

          {/* Mute / Unmute */}
          {isReady && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              title={isMuted ? "Unmute" : "Mute"}
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="size-3" />
              ) : (
                <Volume2 className="size-3" />
              )}
            </Button>
          )}

          {/* Copy link at timestamp */}
          {timestamp != null && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              title="Copy Twitch link at timestamp"
              onClick={() => {
                const t = secondsToTwitchTimestamp(timestamp);
                const url = `https://www.twitch.tv/videos/${videoId}?t=${t}`;
                navigator.clipboard.writeText(url);
              }}
            >
              <Copy className="size-3" />
            </Button>
          )}

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Close player"
            onClick={hideEmbed}
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Row 2: Timeline — peeks out from behind Row 1 on hover */}
      {isReady && duration > 0 && (
        <div
          className={cn(
            "px-3 py-3 transition-[margin] duration-200 ease-out",
            isHovered ? "mt-0" : "-mt-8"
          )}
        >
          <EmbedTimeline
            currentTime={currentTime}
            duration={duration}
            bazaarChapters={bazaarChapters}
            ghosts={sortedGhosts}
            currentGhostId={currentGhost?.detection_id ?? null}
            onSeek={seek}
          />
        </div>
      )}
    </div>
  );
}
