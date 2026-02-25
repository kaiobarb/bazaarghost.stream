"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Ghost,
  Video,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownWideNarrow,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { StreamerWithDetections } from "@/lib/server-utils";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

type SortKey = "ghosts" | "vods" | "name";
type SortDir = "asc" | "desc";

const defaultDir: Record<SortKey, SortDir> = {
  ghosts: "desc",
  vods: "desc",
  name: "asc",
};

const sortOptions: {
  value: SortKey;
  label: string;
  iconAsc: typeof ArrowUpNarrowWide;
  iconDesc: typeof ArrowDownWideNarrow;
}[] = [
  {
    value: "ghosts",
    label: "Ghosts",
    iconAsc: ArrowUpNarrowWide,
    iconDesc: ArrowDownWideNarrow,
  },
  {
    value: "vods",
    label: "VODs",
    iconAsc: ArrowUpNarrowWide,
    iconDesc: ArrowDownWideNarrow,
  },
  {
    value: "name",
    label: "A–Z",
    iconAsc: ArrowDownAZ,
    iconDesc: ArrowUpAZ,
  },
];

function sortStreamers(
  list: StreamerWithDetections[],
  key: SortKey,
  dir: SortDir
): StreamerWithDetections[] {
  const sorted = [...list];
  const mul = dir === "desc" ? -1 : 1;

  switch (key) {
    case "ghosts":
      return sorted.sort(
        (a, b) => mul * ((a.detection_count ?? 0) - (b.detection_count ?? 0))
      );
    case "vods":
      return sorted.sort(
        (a, b) => mul * ((a.vod_count ?? 0) - (b.vod_count ?? 0))
      );
    case "name":
      return sorted.sort(
        (a, b) =>
          mul *
          (a.streamer_display_name ?? "").localeCompare(
            b.streamer_display_name ?? ""
          )
      );
  }
}

interface StreamerListProps {
  streamers: StreamerWithDetections[];
  /** Show the search bar. Set false when embedding a subset (e.g. on the landing page). */
  showSearch?: boolean;
}

export function StreamerList({
  streamers,
  showSearch = true,
}: StreamerListProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ghosts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      // Toggle direction
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultDir[key]);
    }
  };

  const filtered = useMemo(() => {
    let result = streamers;
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          (s.streamer_display_name ?? "").toLowerCase().includes(q) ||
          (s.streamer_login ?? "").toLowerCase().includes(q)
      );
    }
    return sortStreamers(result, sortKey, sortDir);
  }, [streamers, query, sortKey, sortDir]);

  return (
    <div>
      {showSearch && (
        <>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search streamers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="mb-4 flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-0.5">
              Sort by
            </span>
            {sortOptions.map((opt) => {
              const active = sortKey === opt.value;
              const Icon = active
                ? sortDir === "asc"
                  ? opt.iconAsc
                  : opt.iconDesc
                : opt.iconDesc;

              return (
                <button
                  key={opt.value}
                  onClick={() => handleSort(opt.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {opt.label}
                  <Icon className="size-3" />
                </button>
              );
            })}
          </div>
        </>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          No streamers found.
        </p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((s) => (
            <Link
              key={s.streamer_id}
              href={`/streamers/${s.streamer_login}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
            >
              <Avatar className="size-10 shrink-0">
                <AvatarImage
                  src={s.streamer_avatar ?? undefined}
                  alt={s.streamer_display_name ?? ""}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {(s.streamer_display_name ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-card-foreground truncate">
                  {s.streamer_display_name}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Ghost className="size-3" />
                    {formatNumber(s.detection_count ?? 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="size-3" />
                    {s.vod_count ?? 0} VODs
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
