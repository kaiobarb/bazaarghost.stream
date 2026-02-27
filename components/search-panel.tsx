"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRouter,
  useSearchParams,
  usePathname,
  useParams,
} from "next/navigation";
import Link from "next/link";
import {
  Search,
  Loader2,
  Ghost,
  Video,
  Users,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/types/supabase";

import { EmbedPanel } from "@/components/embed-panel";
import { useEmbed } from "@/components/embed-provider";
import {
  GhostResultRow,
  type GhostResult,
} from "@/components/ghost-result-row";
import { VodResultRow, type VodResult } from "@/components/vod-result-row";
import { StreamerResultRow } from "@/components/streamer-result-row";
import { PaginationControls } from "@/components/pagination-controls";
import type { StreamerWithDetections } from "@/lib/server-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchMode = "ghosts" | "vods" | "streamers";

type StreamerOption =
  Database["public"]["Views"]["streamers_with_detections"]["Row"];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// URL helpers — derive search state from path + params
// ---------------------------------------------------------------------------

interface RouteContext {
  /** The streamer from the path (e.g. /streamer/nl_kripp → "nl_kripp") */
  pathStreamer: string | null;
  /** The vodId from the path (e.g. /streamer/nl_kripp/2345678) */
  pathVodId: string | null;
  /** The ghost username from the path (e.g. /streamer/nl_kripp/vs/Ender/2345678) */
  pathUsername: string | null;
}

function deriveSearchMode(pathname: string): SearchMode {
  if (pathname.startsWith("/streamers")) return "streamers";
  if (pathname.startsWith("/vods")) return "vods";
  // /search, /streamer/*, and / all default to ghost mode
  return "ghosts";
}

function deriveRouteContext(pathname: string): RouteContext {
  // Match /streamer/[streamer]/vs/[username]/[vodId]
  const vsMatch = pathname.match(/^\/streamer\/([^/]+)\/vs\/([^/]+)\/([^/]+)/);
  if (vsMatch) {
    return {
      pathStreamer: decodeURIComponent(vsMatch[1]),
      pathUsername: decodeURIComponent(vsMatch[2]),
      pathVodId: decodeURIComponent(vsMatch[3]),
    };
  }

  // Match /streamer/[streamer]/[vodId]
  const vodMatch = pathname.match(/^\/streamer\/([^/]+)\/([^/]+)/);
  if (vodMatch && vodMatch[2] !== "vs") {
    return {
      pathStreamer: decodeURIComponent(vodMatch[1]),
      pathVodId: decodeURIComponent(vodMatch[2]),
      pathUsername: null,
    };
  }

  // Match /streamer/[streamer]
  const streamerMatch = pathname.match(/^\/streamer\/([^/]+)/);
  if (streamerMatch) {
    return {
      pathStreamer: decodeURIComponent(streamerMatch[1]),
      pathVodId: null,
      pathUsername: null,
    };
  }

  return { pathStreamer: null, pathVodId: null, pathUsername: null };
}

// ---------------------------------------------------------------------------
// Mode tabs config
// ---------------------------------------------------------------------------

const modeOptions: {
  value: SearchMode;
  label: string;
  icon: typeof Ghost;
  href: string;
}[] = [
  { value: "ghosts", label: "Ghosts", icon: Ghost, href: "/search" },
  { value: "vods", label: "VODs", icon: Video, href: "/vods" },
  { value: "streamers", label: "Streamers", icon: Users, href: "/streamers" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SearchPanelProps {
  initialStats?: { streamers: number; vods: number; matchups: number };
}

export default function SearchPanel({
  initialStats = { streamers: 0, vods: 0, matchups: 0 },
}: SearchPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isVisible: embedVisible,
    videoId: activeVideoId,
    currentTime: activeTime,
  } = useEmbed();

  // ---- Derived state from URL ----
  const searchMode = deriveSearchMode(pathname);
  const routeContext = deriveRouteContext(pathname);
  const queryParam = searchParams.get("q") ?? "";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  // Streamer filter: path-implied (from /streamer/[name]) or param-based
  const streamerParam = searchParams.get("streamer") ?? null;
  const vodParam = searchParams.get("vod") ?? null;

  // Effective filters: explicit params override path defaults
  const effectiveStreamer = streamerParam ?? routeContext.pathStreamer;
  const effectiveVod = vodParam ?? routeContext.pathVodId;

  // ---- Local state ----
  const [inputValue, setInputValue] = useState(queryParam);
  const [streamerOptions, setStreamerOptions] = useState<StreamerOption[]>([]);
  const [openStreamerPopover, setOpenStreamerPopover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Results
  const [ghostResults, setGhostResults] = useState<GhostResult[]>([]);
  const [vodResults, setVodResults] = useState<VodResult[]>([]);
  const [streamerResults, setStreamerResults] = useState<
    StreamerWithDetections[]
  >([]);
  const [totalResults, setTotalResults] = useState(0);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const prevSearchKey = useRef<string>("");

  // Stats
  const [stats] = useState(initialStats);

  // ---- Sync input value when URL changes (e.g. back/forward) ----
  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  // ---- Fetch streamer options on mount ----
  useEffect(() => {
    const fetchStreamers = async () => {
      const { data } = await supabase
        .from("streamers_with_detections")
        .select("*")
        .order("streamer_display_name", { ascending: true });
      if (data) setStreamerOptions(data);
    };
    fetchStreamers();
  }, []);

  // ---- Resolve effective streamer name/id for display & filtering ----
  const resolvedStreamer = useMemo(() => {
    if (!effectiveStreamer) return null;
    // Try matching by display_name (path uses display_name)
    const byName = streamerOptions.find(
      (s) =>
        (s.streamer_display_name ?? "").toLowerCase() ===
        effectiveStreamer.toLowerCase()
    );
    if (byName)
      return {
        id: byName.streamer_id,
        displayName: byName.streamer_display_name ?? "",
        avatar: byName.streamer_avatar ?? "",
      };
    // Try matching by id (param might be an id)
    const byId = streamerOptions.find(
      (s) => String(s.streamer_id) === effectiveStreamer
    );
    if (byId)
      return {
        id: byId.streamer_id,
        displayName: byId.streamer_display_name ?? "",
        avatar: byId.streamer_avatar ?? "",
      };
    return null;
  }, [effectiveStreamer, streamerOptions]);

  // ---- URL mutation helpers ----
  const buildSearchUrl = useCallback(
    (overrides: Record<string, string | null | undefined> = {}) => {
      const params = new URLSearchParams();
      const q = overrides.q !== undefined ? overrides.q : searchParams.get("q");
      if (q) params.set("q", q);

      const streamer =
        overrides.streamer !== undefined
          ? overrides.streamer
          : searchParams.get("streamer");
      if (streamer) params.set("streamer", streamer);

      const vod =
        overrides.vod !== undefined ? overrides.vod : searchParams.get("vod");
      if (vod) params.set("vod", vod);

      const page =
        overrides.page !== undefined
          ? overrides.page
          : searchParams.get("page");
      if (page && page !== "1") params.set("page", page);

      // Determine base path — stay on the same base path unless mode changes
      let basePath = pathname;
      if (overrides._basePath !== undefined) {
        basePath = overrides._basePath ?? "/search";
      }

      const qs = params.toString();
      return `${basePath}${qs ? `?${qs}` : ""}`;
    },
    [pathname, searchParams]
  );

  const replaceParams = useCallback(
    (overrides: Record<string, string | null | undefined>) => {
      const url = buildSearchUrl(overrides);
      router.replace(url, { scroll: false });
    },
    [router, buildSearchUrl]
  );

  // ---- Search input handler ----
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        replaceParams({
          q: value || null,
          page: null, // reset page on new query
        });
      }, 300);
    },
    [replaceParams]
  );

  // ---- Ghost search ----
  const performGhostSearch = useCallback(
    async (
      query: string,
      page: number,
      streamerId: number | null,
      vodSourceId: string | null
    ) => {
      setIsLoading(true);
      try {
        const offset = (page - 1) * PAGE_SIZE;
        const rpcParams: Record<string, any> = {
          search_query: query.trim() || undefined,
          similarity_threshold: 0.25,
          result_limit: PAGE_SIZE,
          result_offset: offset,
          date_range_filter: "all",
        };

        if (streamerId) {
          rpcParams.streamer_id_filter = streamerId;
        }

        if (vodSourceId) {
          rpcParams.vod_source_id_filter = vodSourceId;
        }

        const { data, error } = await supabase.rpc(
          "fuzzy_search_detections",
          rpcParams
        );

        if (error) {
          console.error("Search error:", error);
          setGhostResults([]);
          setTotalResults(0);
        } else if (data) {
          setGhostResults(data as GhostResult[]);
          const firstRow = data[0] as any;
          if (firstRow?.total_count != null) {
            setTotalResults(Number(firstRow.total_count));
          } else if (data.length < PAGE_SIZE) {
            setTotalResults(offset + data.length);
          } else {
            setTotalResults(
              Math.max((page + 1) * PAGE_SIZE, offset + data.length)
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ---- VOD search ----
  const performVodSearch = useCallback(
    async (query: string, page: number, streamerDisplayName: string | null) => {
      setIsLoading(true);
      try {
        const offset = (page - 1) * PAGE_SIZE;

        let q = supabase
          .from("vod_stats")
          .select("*", { count: "exact" })
          .eq("availability", "available")
          .order("published_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (streamerDisplayName) {
          q = q.eq("streamer", streamerDisplayName);
        }

        const trimmed = query.trim();
        if (trimmed) {
          q = q.or(`title.ilike.%${trimmed}%,source_id.ilike.%${trimmed}%`);
        }

        q = q.gt("total_detections", 0);

        const { data, count, error } = await q;

        if (error) {
          console.error("VOD search error:", error);
          setVodResults([]);
          setTotalResults(0);
        } else if (data) {
          const streamerByName = new Map(
            streamerOptions.map((s) => [s.streamer_display_name, s])
          );

          const mapped: VodResult[] = data
            .filter((v) => v.source_id && v.title)
            .map((v) => {
              const s = streamerByName.get(v.streamer ?? "");
              return {
                vod_id: v.id ?? 0,
                vod_source_id: v.source_id!,
                title: v.title!,
                published_at: v.published_at ?? "",
                duration_seconds: v.duration_seconds ?? 0,
                streamer_id: s?.streamer_id ?? 0,
                streamer_display_name: v.streamer ?? "",
                streamer_avatar: s?.streamer_avatar ?? "",
                streamer_login: s?.streamer_login ?? "",
                ghost_count: v.total_detections ?? 0,
              };
            });

          setVodResults(mapped);
          setTotalResults(count ?? mapped.length);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [streamerOptions]
  );

  // ---- Streamer search (client-side filter) ----
  const filteredStreamers = useMemo(() => {
    if (searchMode !== "streamers") return [];
    const q = queryParam.trim().toLowerCase();
    let list = streamerOptions;
    if (q) {
      list = list.filter(
        (s) =>
          (s.streamer_display_name ?? "").toLowerCase().includes(q) ||
          (s.streamer_login ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort(
      (a, b) => (b.detection_count ?? 0) - (a.detection_count ?? 0)
    );
  }, [streamerOptions, queryParam, searchMode]);

  // ---- Trigger search when URL state changes ----
  useEffect(() => {
    // Build a key from the search-relevant params to avoid duplicate fetches
    const searchKey = `${searchMode}|${queryParam}|${pageParam}|${resolvedStreamer?.id ?? ""}|${effectiveVod ?? ""}`;
    if (searchKey === prevSearchKey.current) return;
    prevSearchKey.current = searchKey;

    if (searchMode === "ghosts") {
      performGhostSearch(
        queryParam,
        pageParam,
        resolvedStreamer?.id ?? null,
        effectiveVod
      );
    } else if (searchMode === "vods") {
      performVodSearch(
        queryParam,
        pageParam,
        resolvedStreamer?.displayName ?? null
      );
    }
    // Streamers are filtered client-side (via filteredStreamers memo)
  }, [
    searchMode,
    queryParam,
    pageParam,
    resolvedStreamer,
    effectiveVod,
    performGhostSearch,
    performVodSearch,
  ]);

  // ---- Navigation handlers ----

  /** Ghost result click → navigate to /streamer/[s]/vs/[username]/[vodId] */
  const handleGhostClick = useCallback(
    (ghost: GhostResult) => {
      // Preserve current search params
      const params = new URLSearchParams();
      if (queryParam) params.set("q", queryParam);
      // Carry forward streamer/vod filters only if they were explicit params
      if (streamerParam) params.set("streamer", streamerParam);
      if (vodParam) params.set("vod", vodParam);

      const qs = params.toString();
      const path = `/streamer/${encodeURIComponent(ghost.streamer_display_name)}/vs/${encodeURIComponent(ghost.username)}/${ghost.vod_source_id}`;
      router.push(`${path}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, queryParam, streamerParam, vodParam]
  );

  /** Streamer result click → navigate to /streamer/[name] */
  const handleStreamerClick = useCallback(
    (streamerId: number, name: string) => {
      router.push(`/streamer/${encodeURIComponent(name)}`, { scroll: false });
    },
    [router]
  );

  /** VOD result click → navigate to /streamer/[s]/[vodId] */
  const handleVodClick = useCallback(
    (vod: VodResult) => {
      const path = `/streamer/${encodeURIComponent(vod.streamer_display_name)}/${vod.vod_source_id}`;
      router.push(path, { scroll: false });
    },
    [router]
  );

  /** Navigate to VOD's ghosts (from ghost result row VOD badge) */
  const handleNavigateToVodGhosts = useCallback(
    (vodSourceId: string, _title: string) => {
      // Stay in ghost mode, add vod filter
      replaceParams({ vod: vodSourceId, page: null });
    },
    [replaceParams]
  );

  /** Navigate to streamer's ghosts (from ghost result row streamer link) */
  const handleNavigateToStreamer = useCallback(
    (streamerId: number, name: string) => {
      router.push(`/streamer/${encodeURIComponent(name)}`, { scroll: false });
    },
    [router]
  );

  /** Streamer filter select (from popover dropdown) */
  const handleSelectStreamer = useCallback(
    (opt: StreamerOption | null) => {
      setOpenStreamerPopover(false);
      if (opt) {
        replaceParams({
          streamer: opt.streamer_display_name ?? String(opt.streamer_id),
          page: null,
        });
      } else {
        // "Any streamer" selected — if on a /streamer/... route, the path
        // implies a streamer. Navigate to /search to escape the path context.
        if (routeContext.pathStreamer) {
          const params = new URLSearchParams();
          if (queryParam) params.set("q", queryParam);
          const qs = params.toString();
          router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
        } else {
          replaceParams({ streamer: null, page: null });
        }
      }
    },
    [replaceParams, routeContext.pathStreamer, queryParam, router]
  );

  /** Page change */
  const handlePageChange = useCallback(
    (page: number) => {
      replaceParams({ page: String(page) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [replaceParams]
  );

  // ---- Mode tab href builder (preserves ?q across mode switches) ----
  const buildModeHref = useCallback(
    (baseHref: string) => {
      if (queryParam) return `${baseHref}?q=${encodeURIComponent(queryParam)}`;
      return baseHref;
    },
    [queryParam]
  );

  // ---- Breadcrumb segments derived from URL ----
  const breadcrumbs = useMemo(() => {
    const segments: { label: string; href: string }[] = [];

    if (searchMode === "ghosts") {
      segments.push({ label: "Ghosts", href: "/search" });
    } else if (searchMode === "streamers") {
      segments.push({ label: "Streamers", href: "/streamers" });
    } else if (searchMode === "vods") {
      segments.push({ label: "VODs", href: "/vods" });
    }

    if (routeContext.pathStreamer) {
      segments.push({
        label: routeContext.pathStreamer,
        href: `/streamer/${encodeURIComponent(routeContext.pathStreamer)}`,
      });
    }

    if (routeContext.pathVodId && !routeContext.pathUsername) {
      segments.push({
        label: `VOD ${routeContext.pathVodId}`,
        href: `/streamer/${encodeURIComponent(routeContext.pathStreamer ?? "")}/${routeContext.pathVodId}`,
      });
    }

    if (routeContext.pathUsername && routeContext.pathVodId) {
      segments.push({
        label: routeContext.pathUsername,
        href: `/streamer/${encodeURIComponent(routeContext.pathStreamer ?? "")}/vs/${encodeURIComponent(routeContext.pathUsername)}/${routeContext.pathVodId}`,
      });
    }

    return segments;
  }, [searchMode, routeContext]);

  // ---- Render ----
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4">
      {/* Stats line */}
      <p className="mb-4 text-center font-mono text-xs text-muted-foreground">
        tracking {stats.streamers} streamers &middot; {stats.vods} vods &middot;{" "}
        {stats.matchups} matchups
      </p>

      {/* Search bar + mode tabs */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Streamer filter popover (ghost + vod modes only) */}
        {searchMode !== "streamers" && (
          <Popover
            open={openStreamerPopover}
            onOpenChange={setOpenStreamerPopover}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="h-12 w-full justify-between border-border bg-card sm:w-[180px]"
              >
                {resolvedStreamer ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage
                        src={resolvedStreamer.avatar || undefined}
                        alt={resolvedStreamer.displayName}
                      />
                      <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                        {resolvedStreamer.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                      {resolvedStreamer.displayName}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Any streamer</span>
                )}
                <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search streamers..." />
                <CommandList>
                  <CommandEmpty>No streamer found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => handleSelectStreamer(null)}
                      className="gap-2"
                    >
                      <Check
                        className={cn(
                          "size-3",
                          !effectiveStreamer ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Any streamer
                    </CommandItem>
                    {streamerOptions.map((s) => (
                      <CommandItem
                        key={s.streamer_id}
                        value={s.streamer_display_name ?? ""}
                        onSelect={() => handleSelectStreamer(s)}
                        className="gap-2"
                      >
                        <Check
                          className={cn(
                            "size-3",
                            resolvedStreamer?.id === s.streamer_id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <Avatar className="size-5">
                          <AvatarImage
                            src={s.streamer_avatar ?? undefined}
                            alt={s.streamer_display_name ?? ""}
                          />
                          <AvatarFallback className="text-[8px]">
                            {(s.streamer_display_name ?? "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">
                          {s.streamer_display_name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {searchMode !== "streamers" && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            vs
          </span>
        )}

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              searchMode === "ghosts"
                ? "Search for a ghost username..."
                : searchMode === "streamers"
                  ? "Search streamers..."
                  : "Search VODs..."
            }
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="h-12 pl-11 text-base border-border bg-card placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          {isLoading && (
            <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Mode tabs as links */}
        <div className="flex items-center gap-1">
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = searchMode === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildModeHref(opt.href)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="size-3.5" />
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Split panel: results + embed */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Results panel */}
        <div className={cn("min-w-0", embedVisible ? "lg:w-[45%]" : "w-full")}>
          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbs.map((seg, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="mx-0.5 text-muted-foreground/50">/</span>
                    )}
                    {isLast ? (
                      <span className="font-medium text-foreground">
                        {seg.label}
                      </span>
                    ) : (
                      <Link
                        href={seg.href}
                        className="hover:text-foreground transition-colors"
                      >
                        {seg.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {/* Ghost results */}
          {searchMode === "ghosts" && (
            <>
              {!isLoading && ghostResults.length > 0 && (
                <>
                  <PaginationControls
                    currentPage={pageParam}
                    totalResults={totalResults}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                  />
                  <div className="space-y-2">
                    {ghostResults.map((ghost) => (
                      <GhostResultRow
                        key={ghost.detection_id}
                        ghost={ghost}
                        isActive={
                          activeVideoId === ghost.vod_source_id &&
                          Math.abs(activeTime - ghost.frame_time_seconds) < 5
                        }
                        onNavigateToStreamer={handleNavigateToStreamer}
                        onNavigateToVod={handleNavigateToVodGhosts}
                        onRowClick={() => handleGhostClick(ghost)}
                      />
                    ))}
                  </div>
                  {Math.ceil(totalResults / PAGE_SIZE) > 1 && (
                    <PaginationControls
                      currentPage={pageParam}
                      totalResults={totalResults}
                      pageSize={PAGE_SIZE}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              )}
              {!isLoading && ghostResults.length === 0 && queryParam && (
                <p className="py-16 text-center text-muted-foreground">
                  No ghosts found for &ldquo;{queryParam}&rdquo;
                </p>
              )}
            </>
          )}

          {/* VOD results */}
          {searchMode === "vods" && (
            <>
              {!isLoading && vodResults.length > 0 && (
                <>
                  <PaginationControls
                    currentPage={pageParam}
                    totalResults={totalResults}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                  />
                  <div className="space-y-2">
                    {vodResults.map((vod) => (
                      <VodResultRow
                        key={vod.vod_source_id}
                        vod={vod}
                        isActive={activeVideoId === vod.vod_source_id}
                        onNavigateToStreamer={handleNavigateToStreamer}
                        onNavigateToGhosts={handleNavigateToVodGhosts}
                        onRowClick={() => handleVodClick(vod)}
                      />
                    ))}
                  </div>
                  {Math.ceil(totalResults / PAGE_SIZE) > 1 && (
                    <PaginationControls
                      currentPage={pageParam}
                      totalResults={totalResults}
                      pageSize={PAGE_SIZE}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              )}
              {!isLoading && vodResults.length === 0 && queryParam && (
                <p className="py-16 text-center text-muted-foreground">
                  No VODs found for &ldquo;{queryParam}&rdquo;
                </p>
              )}
            </>
          )}

          {/* Streamer results */}
          {searchMode === "streamers" && (
            <>
              {filteredStreamers.length > 0 ? (
                <div className="space-y-2">
                  {filteredStreamers.map((s) => (
                    <StreamerResultRow
                      key={s.streamer_id}
                      streamer={s}
                      onNavigateToVods={handleStreamerClick}
                    />
                  ))}
                </div>
              ) : (
                queryParam && (
                  <p className="py-16 text-center text-muted-foreground">
                    No streamers found for &ldquo;{queryParam}&rdquo;
                  </p>
                )
              )}
            </>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Embed panel (sticky on desktop) */}
        {embedVisible && (
          <div className="order-first lg:order-last lg:sticky lg:top-4 lg:w-[55%] lg:self-start">
            <EmbedPanel />
          </div>
        )}
      </div>
    </div>
  );
}
