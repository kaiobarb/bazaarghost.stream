"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmbed } from "@/components/embed-provider";
import type { Database } from "@/types/supabase";

export type GhostResult =
  Database["public"]["Functions"]["fuzzy_search_detections"]["Returns"][number];

interface GhostResultRowProps {
  ghost: GhostResult;
  isActive: boolean;
  onNavigateToStreamer: (streamerId: number, name: string) => void;
  onNavigateToVod: (vodSourceId: string, title: string) => void;
  /** Optional override for the row click (used by SearchPanel for route-based navigation). */
  onRowClick?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GhostResultRow({
  ghost,
  isActive,
  onNavigateToStreamer,
  onNavigateToVod,
  onRowClick,
}: GhostResultRowProps) {
  const { setEmbed } = useEmbed();

  const handlePlay = () => {
    // Load the ghost in the embed player
    setEmbed(ghost.vod_source_id, ghost.frame_time_seconds, {
      streamerName: ghost.streamer_display_name,
      streamerAvatar: ghost.streamer_avatar,
      vodTitle: `Video ${ghost.vod_source_id}`,
      date: formatDate(ghost.actual_timestamp),
    });
    // If parent provides a route-based click handler, call it too
    onRowClick?.();
  };

  return (
    <div
      onClick={handlePlay}
      className={cn(
        "cursor-pointer overflow-hidden rounded-lg border transition-colors",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Streamer avatar */}
        <Avatar className="size-10 shrink-0">
          <AvatarImage
            src={ghost.streamer_avatar || "/placeholder.svg"}
            alt={ghost.streamer_display_name}
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {ghost.streamer_display_name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-2">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToStreamer(
                  ghost.streamer_id,
                  ghost.streamer_display_name
                );
              }}
              className="font-medium text-primary hover:underline"
            >
              {ghost.streamer_display_name}
            </button>
            <span className="text-muted-foreground">vs</span>
            {ghost.rank && (
              <Image
                src={`/${ghost.rank.toLowerCase()}.webp`}
                alt={ghost.rank}
                width={28}
                height={28}
                className="inline-block"
              />
            )}
            <span className="font-medium text-foreground">
              {ghost.username}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground md:ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToVod(
                  ghost.vod_source_id,
                  `Video ${ghost.vod_source_id}`
                );
              }}
            >
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-secondary"
              >
                VOD
              </Badge>
            </button>
            <span className="font-mono tabular-nums">
              {formatTimestamp(ghost.frame_time_seconds)}
            </span>
            <span className="hidden sm:inline">
              {formatDate(ghost.actual_timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
