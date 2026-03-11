"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/supabase";

export type GhostResult =
  Database["public"]["Functions"]["fuzzy_search_detections"]["Returns"][number];

/**
 * Props for {@link GhostResultRow}.
 */
interface GhostResultRowProps {
  ghost: GhostResult;
  isActive: boolean;
  /** Called when the row is clicked (play this ghost matchup). */
  onPlay: (ghost: GhostResult) => void;
  /** Called when the streamer name is clicked. */
  onNavigateToStreamer: (streamerId: number, name: string) => void;
}

/**
 * A single ghost search result row.
 *
 * Pure presentational component — all navigation and embed logic is handled
 * by the {@link onPlay} callback provided by the parent.
 */
export function GhostResultRow({
  ghost,
  isActive,
  onPlay,
  onNavigateToStreamer,
}: GhostResultRowProps) {
  return (
    <div
      onClick={() => onPlay(ghost)}
      className={cn(
        "@container box-border h-[72px] cursor-pointer overflow-hidden rounded-lg border transition-colors",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="flex h-full items-center gap-3 px-3">
        {/* Streamer avatar — hidden below 200px */}
        <Avatar className="hidden size-9 shrink-0 @[200px]:block">
          <AvatarImage
            src={ghost.streamer_avatar || "/placeholder.svg"}
            alt={ghost.streamer_display_name}
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {ghost.streamer_display_name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex min-w-0 items-center gap-1 text-sm">
            {/* Streamer name + vs — hidden below 200px */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToStreamer(
                  ghost.streamer_id,
                  ghost.streamer_display_name
                );
              }}
              className="hidden min-w-0 shrink truncate font-medium text-primary hover:underline @[200px]:block"
            >
              {ghost.streamer_display_name}
            </button>
            <span className="hidden shrink-0 text-muted-foreground @[200px]:block">
              vs
            </span>
            {ghost.rank && (
              <Image
                src={`/${ghost.rank.toLowerCase()}.webp`}
                alt={ghost.rank}
                width={22}
                height={22}
                className="inline-block shrink-0"
              />
            )}
            <span className="shrink-0 font-medium text-foreground">
              {ghost.username}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
