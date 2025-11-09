"use client";

import Image from "next/image";
import { Copy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/supabase";

// Union type for both search result types
type DetectionResult =
  | Database["public"]["Functions"]["fuzzy_search_detections"]["Returns"][number]
  | Database["public"]["Functions"]["get_top_streamers_with_recent_detections"]["Returns"][number];

interface DetectionCardProps {
  result: DetectionResult;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

export function DetectionCard({
  result,
  expandedId,
  onToggleExpand,
}: DetectionCardProps) {
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
      {expandedId === result.detection_id &&
        result.vod_source_id &&
        result.frame_time_seconds !== undefined && (
          <div className="border-t border-border md:p-4">
            <div className="mt-4 md:mt-0 mb-4 md:mb-2 ml-4 md:ml-0 flex items-center justify-between">
              <div className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Force iframe reload to replay at matchup timestamp
                    const iframe = document.getElementById(
                      `vod-${result.detection_id}`
                    ) as HTMLIFrameElement;
                    if (iframe) {
                      const src = iframe.src;
                      iframe.src = "";
                      setTimeout(() => {
                        iframe.src = src;
                      }, 0);
                    }
                  }}
                  className="text-foreground rounded-r-none border-r-0 p-6 md:p-4"
                >
                  Go to Timestamp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Copy Twitch VOD URL at timestamp to clipboard
                    if (result.frame_time_seconds !== undefined) {
                      const hours = Math.floor(
                        result.frame_time_seconds / 3600
                      );
                      const minutes = Math.floor(
                        (result.frame_time_seconds % 3600) / 60
                      );
                      const seconds = Math.floor(
                        result.frame_time_seconds % 60
                      );
                      const timeString = `${hours}h${minutes}m${seconds}s`;
                      const url = `https://www.twitch.tv/videos/${result.vod_source_id}?t=${timeString}`;
                      navigator.clipboard.writeText(url);
                    }
                  }}
                  className="text-foreground rounded-l-none p-6 md:px-4 md:py-4"
                  title="Copy link at timestamp"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="aspect-video w-full rounded-md overflow-hidden">
              <iframe
                id={`vod-${result.detection_id}`}
                src={`https://player.twitch.tv/?video=${
                  result.vod_source_id
                }&parent=${
                  typeof window !== "undefined"
                    ? window.location.hostname
                    : "localhost"
                }&time=${result.frame_time_seconds}s&autoplay=true`}
                height="100%"
                width="100%"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}
    </div>
  );
}
