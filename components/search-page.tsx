"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/lib/supabase-client";
import type { Database, Tables } from "@/types/supabase";
import { DetectionCard } from "@/components/detection-card";

type Streamer = Tables<"streamers">;

// Use actual database function return types instead of ad-hoc interfaces
type SearchResult =
  Database["public"]["Functions"]["fuzzy_search_detections"]["Returns"][number];
type TopStreamerDetection =
  Database["public"]["Functions"]["get_top_streamers_with_recent_detections"]["Returns"][number];

// Group top streamers by their streamer_id for display
interface StreamerWithDetections {
  streamer_id: number;
  streamer_login: string;
  streamer_display_name: string;
  streamer_avatar: string;
  total_detections: number;
  total_vods: number;
  recentDetections: TopStreamerDetection[];
}

interface SearchPageProps {
  initialStats?: {
    streamers: number;
    vods: number;
    matchups: number;
  };
  initialTopStreamers?: any[];
}

export default function SearchPage({
  initialStats = { streamers: 0, vods: 0, matchups: 0 },
  initialTopStreamers = [],
}: SearchPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [openStreamerPopover, setOpenStreamerPopover] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [topStreamers, setTopStreamers] = useState<StreamerWithDetections[]>(
    initialTopStreamers as StreamerWithDetections[]
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUpdatingFromURL, setIsUpdatingFromURL] = useState(false);

  // Function to update URL with current filters
  const updateURL = useCallback(
    (params: { username?: string; streamerId?: string | null }) => {
      // Don't update URL if we're currently syncing from URL
      if (isUpdatingFromURL) return;

      const current = new URLSearchParams(searchParams.toString());

      if (params.username !== undefined) {
        if (params.username) {
          current.set("username", params.username);
        } else {
          current.delete("username");
        }
      }

      if (params.streamerId !== undefined) {
        if (params.streamerId) {
          current.set("streamerId", params.streamerId);
        } else {
          current.delete("streamerId");
        }
      }

      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.push(`/${query}`);
    },
    [router, searchParams, isUpdatingFromURL]
  );

  // Initialize on mount and sync with URL params
  useEffect(() => {
    // Skip if we don't have streamers loaded yet
    if (streamers.length === 0) return;

    setIsUpdatingFromURL(true);

    const username = searchParams.get("username");
    const streamerId = searchParams.get("streamerId");

    // Update username
    setSearchQuery(username || "");

    // Update streamer selection
    if (streamerId) {
      const streamer = streamers.find((s) => s.id.toString() === streamerId);
      if (streamer) {
        setSelectedStreamer(streamer);
      } else {
        setSelectedStreamer(null);
      }
    } else {
      setSelectedStreamer(null);
    }

    // Mark as initialized
    if (!isInitialized) {
      setIsInitialized(true);
    }

    // Reset flag after a short delay to allow state updates to complete
    const timer = setTimeout(() => setIsUpdatingFromURL(false), 50);
    return () => clearTimeout(timer);
  }, [searchParams, streamers, isInitialized]); // Re-run when URL params or streamers change

  useEffect(() => {
    fetchStreamers();
    // Only fetch top streamers and stats if we don't have initial data
    // This avoids redundant fetches on initial page load with ISR
    if (initialTopStreamers.length === 0) {
      fetchTopStreamers();
    }
    if (initialStats.streamers === 0) {
      fetchStats();
    }
  }, [supabase]);

  const fetchStreamers = async () => {
    try {
      // Get streamers from detection_search view to ensure we only show streamers with valid detections
      // Limit the query for performance and use recent detections
      const { data, error } = await supabase
        .from("detection_search")
        .select(
          "streamer_id, streamer_login, streamer_display_name, streamer_avatar"
        )
        .not("streamer_id", "is", null)
        .order("actual_timestamp", { ascending: false })
        .limit(1000); // Limit to recent detections for performance

      if (error) throw error;

      if (data) {
        // Create a map to get unique streamers
        const uniqueStreamersMap = new Map<number, Streamer>();

        data.forEach((item: any) => {
          if (item.streamer_id && !uniqueStreamersMap.has(item.streamer_id)) {
            // Create a Streamer object that matches the expected type
            uniqueStreamersMap.set(item.streamer_id, {
              id: item.streamer_id,
              login: item.streamer_login || "", // Provide empty string if null
              display_name: item.streamer_display_name,
              profile_image_url: item.streamer_avatar,
              processing_enabled: true,
              created_at: null,
              updated_at: null,
              has_vods: null,
              num_vods: null,
              num_bazaar_vods: null,
              oldest_vod: null,
            });
          }
        });

        // Convert map to array and sort by display_name
        const uniqueStreamers = Array.from(uniqueStreamersMap.values()).sort(
          (a, b) => {
            const nameA = a.display_name || a.login;
            const nameB = b.display_name || b.login;
            return nameA.localeCompare(nameB);
          }
        );

        setStreamers(uniqueStreamers);
      }
    } catch (err) {
      console.error("Error fetching streamers:", err);
    }
  };

  const fetchStats = async () => {
    try {
      // Call the database function via RPC for efficient server-side counting
      const { data, error } = await supabase.rpc("get_global_stats");

      if (error) throw error;

      if (
        data &&
        typeof data === "object" &&
        "streamers" in data &&
        "vods" in data &&
        "matchups" in data
      ) {
        setStats({
          streamers: (data as any).streamers || 0,
          vods: (data as any).vods || 0,
          matchups: (data as any).matchups || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Set default values on error
      setStats({
        streamers: 0,
        vods: 0,
        matchups: 0,
      });
    }
  };

  const fetchTopStreamers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc(
        "get_top_streamers_with_recent_detections",
        {
          top_count: 10,
          detections_per_streamer: 4,
        }
      );

      if (error) throw error;

      if (data) {
        // Group the flattened results by streamer
        const streamerMap = new Map<number, StreamerWithDetections>();

        data.forEach((row: any) => {
          if (!streamerMap.has(row.streamer_id)) {
            streamerMap.set(row.streamer_id, {
              streamer_id: row.streamer_id,
              streamer_login: row.streamer_login,
              streamer_display_name:
                row.streamer_display_name || row.streamer_login,
              streamer_avatar: row.streamer_avatar || "/placeholder.svg",
              total_detections: row.total_detections,
              total_vods: row.total_vods,
              recentDetections: [],
            });
          }

          const streamer = streamerMap.get(row.streamer_id)!;
          // Push the raw row data - it already matches TopStreamerDetection type
          streamer.recentDetections.push(row);
        });

        // Convert to array maintaining the order from the query
        setTopStreamers(Array.from(streamerMap.values()));
      }
    } catch (err) {
      console.error("Error fetching top streamers:", err);
      setError("Failed to load top streamers");
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the fuzzy search RPC function
      const { data, error } = await supabase.rpc("fuzzy_search_detections", {
        search_query: query.trim() || undefined,
        streamer_id_filter: selectedStreamer?.id || undefined,
        date_range_filter: "all",
        similarity_threshold: 0.25, // Only return results with > 45% similarity
        result_limit: 20,
      });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        // Data already matches SearchResult type - no mapping needed
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Error searching:", err);
      setError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search - triggers after user stops typing
  useEffect(() => {
    // Determine if user has performed a search
    const hasActiveSearch =
      searchQuery.trim() !== "" || selectedStreamer !== null;

    setHasSearched(hasActiveSearch);

    if (hasActiveSearch) {
      // Clear existing timer
      if (searchTimer) {
        clearTimeout(searchTimer);
      }

      // Set new timer for debounced search
      const timer = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);

      setSearchTimer(timer);

      // Cleanup
      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      // Clear results when no search is active
      setResults([]);
    }
  }, [searchQuery, selectedStreamer?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled automatically by the useEffect above
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return num.toString();
  };

  return (
    <div className="mx-auto max-w-4xl md:px-1 py-3">
      {/* Stats Display */}
      <div className="text-xs text-muted-foreground font-mono mb-4 text-center">
        tracking {formatNumber(stats.streamers)} streamers ·{" "}
        {formatNumber(stats.vods)} vods · {formatNumber(stats.matchups)}{" "}
        matchups
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8" autoComplete="off">
        <div className="flex gap-1 md:gap-3 items-center mb-4">
          {/* Streamer Combobox */}
          <Popover
            open={openStreamerPopover}
            onOpenChange={setOpenStreamerPopover}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openStreamerPopover}
                className="justify-between h-14 border-border bg-card hover:bg-secondary hover:text-secondary-foreground"
              >
                {selectedStreamer ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="md:h-6 md:w-6">
                      <AvatarImage
                        src={
                          selectedStreamer.profile_image_url ||
                          "/placeholder.svg"
                        }
                        alt={selectedStreamer.display_name || ""}
                      />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {selectedStreamer.display_name?.[0]?.toUpperCase() ||
                          "S"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate hidden md:inline">
                      {selectedStreamer.display_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Any <span className="hidden md:inline">Streamer</span>
                  </span>
                )}
                <ChevronsUpDown className="ml-1 md:ml-2 h-4 w-4 shrink-0 opacity-50 hidden md:inline" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full md:w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Search streamers..." />
                <CommandList>
                  <CommandEmpty>No streamer found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedStreamer(null);
                        setOpenStreamerPopover(false);
                        updateURL({ streamerId: null });
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selectedStreamer === null
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                      <span>Any Streamer</span>
                    </CommandItem>
                    {streamers.map((streamer) => (
                      <CommandItem
                        key={streamer.id}
                        value={streamer.display_name || ""}
                        onSelect={() => {
                          setSelectedStreamer(streamer);
                          setOpenStreamerPopover(false);
                          updateURL({ streamerId: streamer.id.toString() });
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedStreamer?.id === streamer.id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage
                            src={
                              streamer.profile_image_url || "/placeholder.svg"
                            }
                            alt={streamer.display_name || ""}
                          />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {streamer.display_name?.[0]?.toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{streamer.display_name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* VS Separator */}
          <span className="text-muted-foreground font-medium">vs</span>

          {/* Username Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={(e) => updateURL({ username: e.target.value })}
              autoComplete="on"
              className="h-14 pl-12 pr-4 text-lg border-border bg-card placeholder:text-muted-foreground focus-visible:ring-primary"
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Top Streamers Section - Landing Page */}
      {!isLoading && !hasSearched && topStreamers.length > 0 && (
        <div className="space-y-8">
          {topStreamers.map((streamer) => (
            <div key={streamer.streamer_id} className="space-y-3">
              {/* Streamer Header */}
              <div className="px-2">
                <Button
                  variant="ghost"
                  className="justify-start p-2 h-auto hover:bg-secondary/50"
                  onClick={() => {
                    // Create a Streamer object from the StreamerWithDetections data
                    const streamerObj: Streamer = {
                      id: streamer.streamer_id,
                      login: streamer.streamer_login,
                      display_name: streamer.streamer_display_name,
                      profile_image_url: streamer.streamer_avatar,
                      processing_enabled: true,
                      created_at: null,
                      updated_at: null,
                      has_vods: null,
                      num_vods: null,
                      num_bazaar_vods: null,
                      oldest_vod: null,
                    };
                    setSelectedStreamer(streamerObj);
                    setOpenStreamerPopover(false);
                    updateURL({ streamerId: streamer.streamer_id.toString() });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12">
                      <AvatarImage
                        src={streamer.streamer_avatar}
                        alt={streamer.streamer_display_name}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {streamer.streamer_display_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-foreground">
                        {streamer.streamer_display_name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(streamer.total_detections)} matchups across{" "}
                        {formatNumber(streamer.total_vods)} VODs
                      </p>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Recent Detections List */}
              <div className="space-y-2">
                {streamer.recentDetections.map((result) => (
                  <DetectionCard
                    key={result.detection_id}
                    result={result}
                    expandedId={expandedId}
                    onToggleExpand={toggleExpand}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {!isLoading && hasSearched && results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <DetectionCard
              key={result.detection_id}
              result={result}
              expandedId={expandedId}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && hasSearched && results.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          {searchQuery
            ? `No results found for "${searchQuery}"`
            : "No matches found. Try adjusting your filters."}
        </div>
      )}
    </div>
  );
}
