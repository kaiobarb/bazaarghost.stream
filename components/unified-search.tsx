"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Loader2,
  Check,
  ChevronsUpDown,
  Ghost,
  Video,
  Users,
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
import {
  SearchBreadcrumb,
  type BreadcrumbSegment,
} from "@/components/search-breadcrumb";
import { PaginationControls } from "@/components/pagination-controls";
import type { StreamerWithDetections } from "@/lib/server-utils";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SearchType = "ghosts" | "vods" | "streamers";

type StreamerOption =
  Database["public"]["Views"]["streamers_with_detections"]["Row"];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const typeOptions: { value: SearchType; label: string; icon: typeof Ghost }[] =
  [
    { value: "ghosts", label: "Ghosts", icon: Ghost },
    { value: "vods", label: "VODs", icon: Video },
    { value: "streamers", label: "Streamers", icon: Users },
  ];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UnifiedSearchProps {
  initialStats?: { streamers: number; vods: number; matchups: number };
  initialTopStreamers?: any[];
}

export default function UnifiedSearch({
  initialStats = { streamers: 0, vods: 0, matchups: 0 },
}: UnifiedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isVisible: embedVisible, videoId: activeVideoId } = useEmbed();

  // ---- URL-driven initial state ----
  const initialType = (searchParams.get("type") as SearchType) || "ghosts";
  const initialQuery = searchParams.get("q") || "";
  const initialStreamerId = searchParams.get("streamer") || null;
  const initialVod = searchParams.get("vod") || null;

  // ---- State ----
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedStreamerId, setSelectedStreamerId] = useState<string | null>(
    initialStreamerId
  );
  const [selectedStreamerName, setSelectedStreamerName] = useState<string>("");
  const [streamerOptions, setStreamerOptions] = useState<StreamerOption[]>([]);
  const [openStreamerPopover, setOpenStreamerPopover] = useState(false);

  // Results
  const [ghostResults, setGhostResults] = useState<GhostResult[]>([]);
  const [vodResults, setVodResults] = useState<VodResult[]>([]);
  const [streamerResults, setStreamerResults] = useState<
    StreamerWithDetections[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbSegment[]>(() => {
    const init: BreadcrumbSegment[] = [
      { label: capitalize(initialType), type: initialType },
    ];
    if (initialVod) {
      init.push({
        label: `VOD ${initialVod}`,
        type: "ghosts",
        filterId: initialVod,
      });
    }
    return init;
  });

  const isUpdatingFromURL = useRef(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // Current view derived from breadcrumb stack
  const currentView = breadcrumbs[breadcrumbs.length - 1];
  const viewType = currentView?.type ?? searchType;
  const filterId = currentView?.filterId;

  // Stats
  const [stats] = useState(initialStats);

  // ---- Fetch streamer options on mount ----
  useEffect(() => {
    const fetchStreamers = async () => {
      const { data } = await supabase
        .from("streamers_with_detections")
        .select("*")
        .order("streamer_display_name", { ascending: true });
      if (data) {
        setStreamerOptions(data);
        // Resolve initial streamer name from ID
        if (initialStreamerId) {
          const match = data.find(
            (s) => String(s.streamer_id) === initialStreamerId
          );
          if (match) setSelectedStreamerName(match.streamer_display_name ?? "");
        }
      }
    };
    fetchStreamers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- URL sync (write) ----
  const updateURL = useCallback(
    (overrides: Record<string, string | null> = {}) => {
      if (isUpdatingFromURL.current) return;

      const params = new URLSearchParams();

      const type = overrides.type ?? searchType;
      if (type !== "ghosts") params.set("type", type);

      const q = overrides.q !== undefined ? overrides.q : searchQuery;
      if (q) params.set("q", q);

      const streamer =
        overrides.streamer !== undefined
          ? overrides.streamer
          : selectedStreamerId;
      if (streamer) params.set("streamer", streamer);

      const vod = overrides.vod !== undefined ? overrides.vod : filterId;
      if (vod) params.set("vod", vod);

      const page =
        overrides.page !== undefined ? overrides.page : String(currentPage);
      if (page && page !== "1") params.set("page", page);

      const qs = params.toString();
      router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchType, searchQuery, selectedStreamerId, filterId, currentPage]
  );

  // ---- Ghost search ----
  const performGhostSearch = useCallback(
    async (
      query: string,
      page: number,
      vodFilter?: string,
      streamerFilter?: string | null
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

        if (streamerFilter) {
          rpcParams.streamer_id_filter = Number(streamerFilter);
        }

        if (vodFilter) {
          rpcParams.vod_source_id_filter = vodFilter;
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
          // Try to read total_count from window function
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
        setCurrentPage(page);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ---- VOD search ----
  const performVodSearch = useCallback(
    async (query: string, page: number, streamerFilter?: string | null) => {
      setIsLoading(true);
      try {
        const offset = (page - 1) * PAGE_SIZE;

        // Resolve streamer display_name from ID for the vod_stats filter
        let streamerDisplayName: string | null = null;
        if (streamerFilter) {
          const match = streamerOptions.find(
            (s) => String(s.streamer_id) === streamerFilter
          );
          if (match) streamerDisplayName = match.streamer_display_name ?? null;
        }

        // Build query against vod_stats view
        let q = supabase
          .from("vod_stats")
          .select("*", { count: "exact" })
          .eq("availability", "available")
          .order("published_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        // Filter by streamer (vod_stats.streamer stores display_name)
        if (streamerDisplayName) {
          q = q.eq("streamer", streamerDisplayName);
        }

        // Text search on title or source_id
        const trimmed = query.trim();
        if (trimmed) {
          q = q.or(`title.ilike.%${trimmed}%,source_id.ilike.%${trimmed}%`);
        }

        // Only show VODs that have at least one ghost
        q = q.gt("total_detections", 0);

        const { data, count, error } = await q;

        if (error) {
          console.error("VOD search error:", error);
          setVodResults([]);
          setTotalResults(0);
        } else if (data) {
          // Build a lookup from display_name → streamer info
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
        setCurrentPage(page);
      } finally {
        setIsLoading(false);
      }
    },
    [streamerOptions]
  );

  // ---- Streamer search (client-side filter) ----
  const filteredStreamers = useMemo(() => {
    if (viewType !== "streamers") return [];
    const q = searchQuery.trim().toLowerCase();
    let list = streamerOptions;
    if (q) {
      list = list.filter(
        (s) =>
          (s.streamer_display_name ?? "").toLowerCase().includes(q) ||
          (s.streamer_login ?? "").toLowerCase().includes(q)
      );
    }
    // Sort by detection count desc
    return [...list].sort(
      (a, b) => (b.detection_count ?? 0) - (a.detection_count ?? 0)
    );
  }, [streamerOptions, searchQuery, viewType]);

  // ---- Debounced search trigger ----
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      if (viewType === "ghosts") {
        const vodFilter = filterId ?? undefined;
        performGhostSearch(searchQuery, 1, vodFilter, selectedStreamerId);
      } else if (viewType === "vods") {
        performVodSearch(searchQuery, 1, selectedStreamerId);
      }
      // Streamers are filtered client-side
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [
    searchQuery,
    selectedStreamerId,
    viewType,
    filterId,
    performGhostSearch,
    performVodSearch,
  ]);

  // ---- URL sync on state changes ----
  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // ---- Navigation handlers ----
  const handleTypeChange = useCallback(
    (type: SearchType) => {
      setSearchType(type);
      setBreadcrumbs([{ label: capitalize(type), type }]);
      setCurrentPage(1);
      setGhostResults([]);
      setVodResults([]);
      setTotalResults(0);
      updateURL({ type, vod: null, page: null });
    },
    [updateURL]
  );

  const navigateToStreamerVods = useCallback(
    (streamerId: number, name: string) => {
      setSelectedStreamerId(String(streamerId));
      setSelectedStreamerName(name);
      setSearchType("ghosts");
      setBreadcrumbs((prev) => [
        ...prev,
        { label: name, type: "ghosts", filterId: undefined },
      ]);
      setCurrentPage(1);
      updateURL({
        type: "ghosts",
        streamer: String(streamerId),
        vod: null,
        page: null,
      });
    },
    [updateURL]
  );

  const navigateToVodGhosts = useCallback(
    (vodSourceId: string, title: string) => {
      setBreadcrumbs((prev) => [
        ...prev,
        { label: title, type: "ghosts", filterId: vodSourceId },
      ]);
      setCurrentPage(1);
      updateURL({ type: "ghosts", vod: vodSourceId, page: null });
    },
    [updateURL]
  );

  const handleBreadcrumbNavigate = useCallback(
    (index: number) => {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      const target = newBreadcrumbs[newBreadcrumbs.length - 1];
      setSearchType(target.type);
      setCurrentPage(1);
      updateURL({
        type: target.type,
        vod: target.filterId ?? null,
        page: null,
      });
    },
    [breadcrumbs, updateURL]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (viewType === "ghosts") {
        performGhostSearch(
          searchQuery,
          page,
          filterId ?? undefined,
          selectedStreamerId
        );
      } else if (viewType === "vods") {
        performVodSearch(searchQuery, page, selectedStreamerId);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      updateURL({ page: String(page) });
    },
    [
      viewType,
      searchQuery,
      filterId,
      selectedStreamerId,
      performGhostSearch,
      performVodSearch,
      updateURL,
    ]
  );

  const handleSelectStreamer = useCallback((opt: StreamerOption | null) => {
    if (opt) {
      setSelectedStreamerId(String(opt.streamer_id));
      setSelectedStreamerName(opt.streamer_display_name ?? "");
    } else {
      setSelectedStreamerId(null);
      setSelectedStreamerName("");
    }
    setOpenStreamerPopover(false);
    setCurrentPage(1);
  }, []);

  // ---- Render ----
  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Stats line */}
      <p className="mb-4 text-center font-mono text-xs text-muted-foreground">
        tracking {stats.streamers} streamers &middot; {stats.vods} vods &middot;{" "}
        {stats.matchups} matchups
      </p>

      {/* Search bar + type toggle */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Streamer combobox */}
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
              {selectedStreamerName ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage
                      src={
                        streamerOptions.find(
                          (s) => String(s.streamer_id) === selectedStreamerId
                        )?.streamer_avatar ?? undefined
                      }
                      alt={selectedStreamerName}
                    />
                    <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                      {selectedStreamerName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{selectedStreamerName}</span>
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
                        !selectedStreamerId ? "opacity-100" : "opacity-0"
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
                          String(s.streamer_id) === selectedStreamerId
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

        <span className="hidden text-sm text-muted-foreground sm:inline">
          vs
        </span>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              viewType === "ghosts"
                ? "Search for a ghost username..."
                : viewType === "streamers"
                  ? "Search streamers..."
                  : "Search VODs..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-11 text-base border-border bg-card placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          {isLoading && (
            <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Type toggle chips */}
        <div className="flex items-center gap-1">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => handleTypeChange(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  searchType === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="size-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split panel: results + embed */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Results panel */}
        <div className={cn("min-w-0", embedVisible ? "lg:w-[45%]" : "w-full")}>
          {/* Breadcrumbs */}
          <SearchBreadcrumb
            segments={breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
          />

          {/* Ghost results */}
          {viewType === "ghosts" && (
            <>
              {!isLoading && ghostResults.length > 0 && (
                <>
                  <PaginationControls
                    currentPage={currentPage}
                    totalResults={totalResults}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                  />
                  <div className="space-y-2">
                    {ghostResults.map((ghost) => (
                      <GhostResultRow
                        key={ghost.detection_id}
                        ghost={ghost}
                        isActive={activeVideoId === ghost.vod_source_id}
                        onNavigateToStreamer={navigateToStreamerVods}
                        onNavigateToVod={navigateToVodGhosts}
                      />
                    ))}
                  </div>
                  {Math.ceil(totalResults / PAGE_SIZE) > 1 && (
                    <PaginationControls
                      currentPage={currentPage}
                      totalResults={totalResults}
                      pageSize={PAGE_SIZE}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              )}
              {!isLoading && ghostResults.length === 0 && searchQuery && (
                <p className="py-16 text-center text-muted-foreground">
                  No ghosts found for &ldquo;{searchQuery}&rdquo;
                </p>
              )}
              {!isLoading &&
                ghostResults.length === 0 &&
                !searchQuery &&
                !filterId && (
                  <p className="py-16 text-center text-muted-foreground">
                    Search for a ghost username to get started
                  </p>
                )}
            </>
          )}

          {/* VOD results */}
          {viewType === "vods" && (
            <>
              {!isLoading && vodResults.length > 0 && (
                <>
                  <PaginationControls
                    currentPage={currentPage}
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
                        onNavigateToStreamer={navigateToStreamerVods}
                        onNavigateToGhosts={navigateToVodGhosts}
                      />
                    ))}
                  </div>
                  {Math.ceil(totalResults / PAGE_SIZE) > 1 && (
                    <PaginationControls
                      currentPage={currentPage}
                      totalResults={totalResults}
                      pageSize={PAGE_SIZE}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              )}
              {!isLoading && vodResults.length === 0 && searchQuery && (
                <p className="py-16 text-center text-muted-foreground">
                  No VODs found for &ldquo;{searchQuery}&rdquo;
                </p>
              )}
              {!isLoading && vodResults.length === 0 && !searchQuery && (
                <p className="py-16 text-center text-muted-foreground">
                  Search for a VOD title or select a streamer
                </p>
              )}
            </>
          )}

          {/* Streamer results */}
          {viewType === "streamers" && (
            <>
              {filteredStreamers.length > 0 ? (
                <div className="space-y-2">
                  {filteredStreamers.map((s) => (
                    <StreamerResultRow
                      key={s.streamer_id}
                      streamer={s}
                      onNavigateToVods={navigateToStreamerVods}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-16 text-center text-muted-foreground">
                  {searchQuery
                    ? `No streamers found for "${searchQuery}"`
                    : "No streamers available"}
                </p>
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
