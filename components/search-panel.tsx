"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Loader2,
  Ghost,
  Video,
  Users,
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EmbedDrawer } from "@/components/embed-drawer";
import { useEmbed } from "@/components/embed-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  GhostResultRow,
  type GhostResult,
} from "@/components/ghost-result-row";
import { VodResultRow, type VodResult } from "@/components/vod-result-row";
import { StreamerResultRow } from "@/components/streamer-result-row";
import { VirtualizedResultList } from "@/components/virtualized-result-list";
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

/** Number of items to fetch per batch for infinite scroll */
const FETCH_SIZE = 50;

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

export default function SearchPanel() {
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

  // Results — accumulated for infinite scroll
  const [ghostResults, setGhostResults] = useState<GhostResult[]>([]);
  const [vodResults, setVodResults] = useState<VodResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreGhosts, setHasMoreGhosts] = useState(true);
  const [hasMoreVods, setHasMoreVods] = useState(true);
  const ghostOffsetRef = useRef(0);
  const vodOffsetRef = useRef(0);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const prevSearchKey = useRef<string>("");

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
        });
      }, 300);
    },
    [replaceParams]
  );

  // ---- Ghost search (initial + load-more) ----
  const fetchGhosts = useCallback(
    async (
      query: string,
      streamerId: number | null,
      vodSourceId: string | null,
      append: boolean
    ) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        ghostOffsetRef.current = 0;
      }

      try {
        const offset = append ? ghostOffsetRef.current : 0;
        const rpcParams: Record<string, any> = {
          search_query: query.trim() || undefined,
          similarity_threshold: 0.25,
          result_limit: FETCH_SIZE,
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
          if (!append) {
            setGhostResults([]);
            setTotalResults(0);
          }
          setHasMoreGhosts(false);
        } else if (data) {
          const newItems = data as GhostResult[];
          const firstRow = data[0] as any;
          const serverTotal =
            firstRow?.total_count != null
              ? Number(firstRow.total_count)
              : undefined;

          if (append) {
            setGhostResults((prev) => [...prev, ...newItems]);
          } else {
            setGhostResults(newItems);
          }

          const newOffset = offset + newItems.length;
          ghostOffsetRef.current = newOffset;

          if (serverTotal != null) {
            setTotalResults(serverTotal);
            setHasMoreGhosts(newOffset < serverTotal);
          } else {
            setTotalResults(newOffset);
            setHasMoreGhosts(newItems.length >= FETCH_SIZE);
          }
        }
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // ---- VOD search (initial + load-more) ----
  const fetchVods = useCallback(
    async (
      query: string,
      streamerDisplayName: string | null,
      append: boolean
    ) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        vodOffsetRef.current = 0;
      }

      try {
        const offset = append ? vodOffsetRef.current : 0;

        let q = supabase
          .from("vod_stats")
          .select("*", { count: "exact" })
          .eq("availability", "available")
          .order("published_at", { ascending: false })
          .range(offset, offset + FETCH_SIZE - 1);

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
          if (!append) {
            setVodResults([]);
            setTotalResults(0);
          }
          setHasMoreVods(false);
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

          if (append) {
            setVodResults((prev) => [...prev, ...mapped]);
          } else {
            setVodResults(mapped);
          }

          const serverTotal = count ?? 0;
          const newOffset = offset + mapped.length;
          vodOffsetRef.current = newOffset;
          setTotalResults(serverTotal);
          setHasMoreVods(newOffset < serverTotal);
        }
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
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

  // ---- Trigger search when URL state changes (initial fetch, resets accumulated results) ----
  useEffect(() => {
    // Build a key from the search-relevant params to avoid duplicate fetches
    const searchKey = `${searchMode}|${queryParam}|${resolvedStreamer?.id ?? ""}|${effectiveVod ?? ""}`;
    if (searchKey === prevSearchKey.current) return;
    prevSearchKey.current = searchKey;

    // Reset infinite scroll state
    setHasMoreGhosts(true);
    setHasMoreVods(true);

    if (searchMode === "ghosts") {
      fetchGhosts(
        queryParam,
        resolvedStreamer?.id ?? null,
        effectiveVod,
        false // not appending — fresh search
      );
    } else if (searchMode === "vods") {
      fetchVods(queryParam, resolvedStreamer?.displayName ?? null, false);
    }
    // Streamers are filtered client-side (via filteredStreamers memo)
  }, [
    searchMode,
    queryParam,
    resolvedStreamer,
    effectiveVod,
    fetchGhosts,
    fetchVods,
  ]);

  // ---- Load-more callbacks for infinite scroll ----
  const loadMoreGhosts = useCallback(() => {
    if (isLoadingMore || !hasMoreGhosts) return;
    fetchGhosts(
      queryParam,
      resolvedStreamer?.id ?? null,
      effectiveVod,
      true // append
    );
  }, [
    isLoadingMore,
    hasMoreGhosts,
    fetchGhosts,
    queryParam,
    resolvedStreamer,
    effectiveVod,
  ]);

  const loadMoreVods = useCallback(() => {
    if (isLoadingMore || !hasMoreVods) return;
    fetchVods(queryParam, resolvedStreamer?.displayName ?? null, true);
  }, [isLoadingMore, hasMoreVods, fetchVods, queryParam, resolvedStreamer]);

  // ---- Navigation handlers ----

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
      replaceParams({ vod: vodSourceId });
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
          replaceParams({ streamer: null });
        }
      }
    },
    [replaceParams, routeContext.pathStreamer, queryParam, router]
  );

  // ---- Mode tab href builder (preserves ?q across mode switches) ----
  const buildModeHref = useCallback(
    (baseHref: string) => {
      if (queryParam) return `${baseHref}?q=${encodeURIComponent(queryParam)}`;
      return baseHref;
    },
    [queryParam]
  );

  // ---- Shared UI fragments ----
  const isMobile = useIsMobile();

  // Measure search header height so the mobile sheet stops just below it
  const searchHeaderRef = useRef<HTMLDivElement>(null);
  const [searchHeaderHeight, setSearchHeaderHeight] = useState(0);

  useEffect(() => {
    const el = searchHeaderRef.current;
    if (!el) return;
    const measure = () =>
      setSearchHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  const searchHeader = (
    <div
      ref={searchHeaderRef}
      className="relative z-50 flex flex-col gap-3 bg-background p-1"
    >
      <div className="@container flex flex-col gap-2">
        {/* Mode tabs */}
        <Tabs
          value={searchMode}
          onValueChange={(v: string) => {
            const opt = modeOptions.find((o) => o.value === v);
            if (opt) router.push(buildModeHref(opt.href));
          }}
        >
          <TabsList className="w-full" variant="line">
            {modeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className="after:bg-accent data-[state=active]:text-accent dark:data-[state=active]:text-accent"
                >
                  <Icon className="size-3.5" />
                  {opt.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Search inputs — vary by mode */}
        {searchMode === "ghosts" ? (
          /* Ghost mode: stacked when narrow, inline when wide */
          <div className="flex flex-col items-stretch gap-2 @[20rem]:flex-row @[20rem]:items-center">
            <Popover
              open={openStreamerPopover}
              onOpenChange={setOpenStreamerPopover}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-10 w-full justify-between border-border bg-card px-3 @[20rem]:w-auto @[20rem]:shrink-0"
                >
                  {resolvedStreamer ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarImage
                          src={resolvedStreamer.avatar || undefined}
                          alt={resolvedStreamer.displayName}
                        />
                        <AvatarFallback className="bg-primary text-[7px] text-primary-foreground">
                          {resolvedStreamer.displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[8rem] truncate text-sm">
                        {resolvedStreamer.displayName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Streamer
                    </span>
                  )}
                  {resolvedStreamer ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 shrink-0 rounded-sm p-0.5 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStreamer(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          handleSelectStreamer(null);
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  ) : (
                    <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
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
                              {(s.streamer_display_name ??
                                "?")[0]?.toUpperCase()}
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

            <span className="shrink-0 self-center text-xs font-medium text-muted-foreground">
              vs
            </span>

            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ghost username..."
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-10 border-border bg-card pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ) : searchMode === "vods" ? (
          /* VOD mode: streamer dropdown + search stacked */
          <>
            <Popover
              open={openStreamerPopover}
              onOpenChange={setOpenStreamerPopover}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-10 w-full justify-between border-border bg-card"
                >
                  {resolvedStreamer ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage
                          src={resolvedStreamer.avatar || undefined}
                          alt={resolvedStreamer.displayName}
                        />
                        <AvatarFallback className="bg-primary text-[7px] text-primary-foreground">
                          {resolvedStreamer.displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm">
                        {resolvedStreamer.displayName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Any streamer
                    </span>
                  )}
                  {resolvedStreamer ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 shrink-0 rounded-sm p-0.5 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStreamer(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          handleSelectStreamer(null);
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  ) : (
                    <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
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
                              {(s.streamer_display_name ??
                                "?")[0]?.toUpperCase()}
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search VODs..."
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-10 border-border bg-card pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </>
        ) : (
          /* Streamers mode: just the search input */
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search streamers..."
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              className="h-10 border-border bg-card pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  );

  const searchResults = (
    <>
      {searchMode === "ghosts" && (
        <>
          {!isLoading && ghostResults.length > 0 && (
            <VirtualizedResultList
              items={ghostResults}
              totalCount={totalResults}
              getItemKey={(g) => g.detection_id}
              renderItem={(ghost) => (
                <GhostResultRow
                  ghost={ghost}
                  isActive={
                    activeVideoId === ghost.vod_source_id &&
                    Math.abs(activeTime - ghost.frame_time_seconds) < 5
                  }
                  onNavigateToStreamer={handleNavigateToStreamer}
                />
              )}
              onLoadMore={loadMoreGhosts}
              isLoadingMore={isLoadingMore}
              hasMore={hasMoreGhosts}
            />
          )}
          {!isLoading && ghostResults.length === 0 && queryParam && (
            <p className="px-4 py-16 text-center text-muted-foreground">
              No ghosts found for &ldquo;{queryParam}&rdquo;
            </p>
          )}
        </>
      )}

      {searchMode === "vods" && (
        <>
          {!isLoading && vodResults.length > 0 && (
            <VirtualizedResultList
              items={vodResults}
              totalCount={totalResults}
              getItemKey={(v) => v.vod_source_id}
              renderItem={(vod) => (
                <VodResultRow
                  vod={vod}
                  isActive={activeVideoId === vod.vod_source_id}
                  onNavigateToStreamer={handleNavigateToStreamer}
                  onNavigateToGhosts={handleNavigateToVodGhosts}
                  onRowClick={() => handleVodClick(vod)}
                />
              )}
              onLoadMore={loadMoreVods}
              isLoadingMore={isLoadingMore}
              hasMore={hasMoreVods}
            />
          )}
          {!isLoading && vodResults.length === 0 && queryParam && (
            <p className="px-4 py-16 text-center text-muted-foreground">
              No VODs found for &ldquo;{queryParam}&rdquo;
            </p>
          )}
        </>
      )}

      {searchMode === "streamers" && (
        <>
          {filteredStreamers.length > 0 ? (
            <VirtualizedResultList
              items={filteredStreamers}
              totalCount={filteredStreamers.length}
              getItemKey={(s) =>
                s.streamer_id ??
                s.streamer_login ??
                s.streamer_display_name ??
                "unknown"
              }
              renderItem={(s) => (
                <StreamerResultRow
                  streamer={s}
                  onNavigateToVods={handleStreamerClick}
                />
              )}
              onLoadMore={() => {}}
              isLoadingMore={false}
              hasMore={false}
            />
          ) : (
            queryParam && (
              <p className="px-4 py-16 text-center text-muted-foreground">
                No streamers found for &ldquo;{queryParam}&rdquo;
              </p>
            )
          )}
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );

  // ---- Mobile: search in page, embed in drawer ----
  if (isMobile) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
        {searchHeader}
        {searchResults}
        <EmbedDrawer headerHeight={searchHeaderHeight} />
      </div>
    );
  }

  // ---- Desktop: resizable sidebar + main ----
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 w-full flex-1"
    >
      {/* Search panel */}
      <ResizablePanel
        defaultSize="30%"
        minSize="20%"
        maxSize="50%"
        className="flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        {searchHeader}
        {searchResults}
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Embed / main content */}
      <ResizablePanel
        defaultSize="70%"
        minSize="40%"
        className="overflow-hidden bg-background"
      >
        <div className="flex h-full flex-col">
          <EmbedPanel />
          {!embedVisible && (
            <div className="flex flex-1 items-center justify-center border border-dashed border-border bg-card/30 px-6">
              <p className="text-center text-sm text-muted-foreground">
                Select a result to load a VOD embed.
              </p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
