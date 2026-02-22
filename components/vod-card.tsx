"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { VodTimeline } from "@/components/vod-timeline";
import { CopyId } from "@/components/copy-id";
import { Clock, Layers, Ghost, Calendar, ExternalLink } from "lucide-react";

export interface MergedVod {
  /** Twitch VOD ID (source_id in DB) */
  twitchId: string;
  title: string;
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string | null;
  twitchUrl: string;
  twitchOnly: boolean;
  // DB fields (null when twitchOnly)
  chunks: number | null;
  totalDetections: number | null;
  bazaarChapters: number[] | null;
  status: string | null;
  /** DB streamer ID, used to build search link */
  streamerId: number | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface VodCardProps {
  vod: MergedVod;
}

export function VodCard({ vod }: VodCardProps) {
  const router = useRouter();
  const searchHref = vod.streamerId ? `/?streamerId=${vod.streamerId}` : "/";

  return (
    <div
      onClick={() => router.push(searchHref)}
      className={cn(
        "group block cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50",
        vod.twitchOnly && "opacity-50"
      )}
    >
      {/* Title row: title, VOD ID (copy), Twitch link */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="font-medium text-card-foreground line-clamp-2 text-sm leading-snug">
            {vod.title || "Untitled broadcast"}
          </h3>
          <CopyId value={vod.twitchId} label="Copy VOD ID" />
        </div>
        <a
          href={vod.twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          title="Watch on Twitch"
        >
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {formatDate(vod.publishedAt)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatDuration(vod.durationSeconds)}
        </span>
        <span className="flex items-center gap-1">
          <Layers className="size-3" />
          {vod.chunks != null ? vod.chunks : "\u2014"} chunks
        </span>
        <span className="flex items-center gap-1">
          <Ghost className="size-3" />
          {vod.totalDetections != null ? vod.totalDetections : "\u2014"} ghosts
        </span>
      </div>

      {/* Timeline */}
      <VodTimeline
        durationSeconds={vod.durationSeconds}
        bazaarChapters={vod.bazaarChapters}
      />

      {/* Status badge for DB vods */}
      {!vod.twitchOnly && vod.status && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              vod.status === "completed" && "bg-green-500",
              vod.status === "processing" && "bg-yellow-500",
              vod.status === "pending" && "bg-muted-foreground",
              vod.status === "failed" && "bg-destructive",
              vod.status === "partial" && "bg-orange-400"
            )}
          />
          <span className="text-[10px] text-muted-foreground capitalize">
            {vod.status}
          </span>
        </div>
      )}
    </div>
  );
}
