"use client";

import { Copy, RotateCw, Video, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEmbed } from "@/components/embed-provider";
import { secondsToTwitchTimestamp } from "@/lib/utils";

export function EmbedPanel() {
  const { videoId, timestamp, meta, isVisible, hideEmbed, containerId, error } =
    useEmbed();

  if (!isVisible || !videoId) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Player area */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-black">
        <div id={containerId} className="size-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-destructive">
            Error loading player: {error}
          </div>
        )}
      </div>

      {/* Controls + meta bar */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        {meta && (
          <>
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={meta.streamerAvatar} alt={meta.streamerName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                {meta.streamerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-card-foreground">
                {meta.streamerName}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {meta.vodTitle}
                </span>
              </p>
            </div>
          </>
        )}
        {!meta && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Video className="size-3" />
            <span>Video {videoId}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
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
    </div>
  );
}
