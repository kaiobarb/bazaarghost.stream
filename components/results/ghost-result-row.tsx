"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEmbed } from "@/components/embed";
import { usePanelControls } from "@/components/search/panel-context";
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
  const { setEmbed, setActiveGhost } = useEmbed();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { expandEmbed, isEmbedCollapsed } = usePanelControls();

  const handlePlay = () => {
    // Optimistic ghost + URL update before the player seek lands
    setActiveGhost({
      detection_id: ghost.detection_id,
      username: ghost.username,
      rank: ghost.rank,
      frame_time_seconds: ghost.frame_time_seconds,
    });

    const basePath = `/${encodeURIComponent(ghost.streamer_display_name)}/${ghost.vod_source_id}/${encodeURIComponent(ghost.username)}`;
    // Preserve all current search params so the search results don't re-fetch
    const qs = searchParams.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });

    setEmbed(ghost.vod_source_id, ghost.frame_time_seconds, {
      streamerName: ghost.streamer_display_name,
      streamerAvatar: ghost.streamer_avatar,
      vodTitle: `Video ${ghost.vod_source_id}`,
      date: formatDate(ghost.actual_timestamp),
    });

    // Auto-expand embed panel if collapsed so the player is visible
    if (isEmbedCollapsed()) {
      expandEmbed();
    }
  };

  return (
    <div
      onClick={handlePlay}
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
