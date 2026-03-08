"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEmbed } from "@/components/embed-provider";
import type { Database } from "@/types/supabase";

export type GhostResult =
  Database["public"]["Functions"]["fuzzy_search_detections"]["Returns"][number];

interface GhostResultRowProps {
  ghost: GhostResult;
  isActive: boolean;
  onNavigateToStreamer: (streamerId: number, name: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GhostResultRow({
  ghost,
  isActive,
  onNavigateToStreamer,
}: GhostResultRowProps) {
  const { setEmbed } = useEmbed();

  const handlePlay = () => {
    setEmbed(ghost.vod_source_id, ghost.frame_time_seconds, {
      streamerName: ghost.streamer_display_name,
      streamerAvatar: ghost.streamer_avatar,
      vodTitle: `Video ${ghost.vod_source_id}`,
      date: formatDate(ghost.actual_timestamp),
    });
  };

  return (
    <div
      onClick={handlePlay}
      className={cn(
        "box-border h-[72px] cursor-pointer overflow-hidden rounded-lg border transition-colors",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="flex h-full items-center gap-3 px-3">
        {/* Streamer avatar */}
        <Avatar className="size-9 shrink-0">
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
          <div className="flex items-center gap-1 truncate text-sm">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToStreamer(
                  ghost.streamer_id,
                  ghost.streamer_display_name
                );
              }}
              className="shrink-0 font-medium text-primary hover:underline"
            >
              {ghost.streamer_display_name}
            </button>
            <span className="shrink-0 text-muted-foreground">vs</span>
            {ghost.rank && (
              <Image
                src={`/${ghost.rank.toLowerCase()}.webp`}
                alt={ghost.rank}
                width={22}
                height={22}
                className="inline-block shrink-0"
              />
            )}
            <span className="truncate font-medium text-foreground">
              {ghost.username}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
