"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Moon,
  Sun,
  Loader2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import Image from "next/image";
import {
  supabase,
  type DetectionSearchView,
  type Streamer,
} from "@/lib/supabase";

interface SearchResult {
  id: string;
  streamerName: string;
  streamerAvatar: string;
  username: string;
  date: string;
  vodUrl?: string;
  vodSourceId?: string;
  frameTimeSeconds?: number;
  confidence?: number;
  rank?: string;
}

export default function SearchPage() {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(
    null
  );
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [openStreamerPopover, setOpenStreamerPopover] = useState(false);
  const [stats, setStats] = useState({
    streamers: 0,
    vods: 0,
    matchups: 0
  });

  useEffect(() => {
    fetchStreamers();
    fetchInitialResults();
    fetchStats();
  }, [supabase]);

  const fetchStreamers = async () => {
    try {
      // Get streamers from detection_search view to ensure we only show streamers with valid detections
      // Limit the query for performance and use recent detections
      const { data, error } = await supabase
        .from("detection_search")
        .select("streamer_id, streamer_login, streamer_display_name, streamer_avatar")
        .not("streamer_id", "is", null)
        .order("actual_timestamp", { ascending: false })
        .limit(1000); // Limit to recent detections for performance

      if (error) throw error;

      if (data) {
        // Create a map to get unique streamers
        const uniqueStreamersMap = new Map<number, Streamer>();

        data.forEach(item => {
          if (item.streamer_id && !uniqueStreamersMap.has(item.streamer_id)) {
            // Create a Streamer object that matches the expected type
            uniqueStreamersMap.set(item.streamer_id, {
              id: item.streamer_id,
              login: item.streamer_login,
              display_name: item.streamer_display_name,
              profile_image_url: item.streamer_avatar,
              processing_enabled: true,
              created_at: null,
              updated_at: null,
              has_vods: null,
              num_vods: null,
              num_bazaar_vods: null,
              oldest_vod: null
            });
          }
        });

        // Convert map to array and sort by display_name
        const uniqueStreamers = Array.from(uniqueStreamersMap.values())
          .sort((a, b) => {
            const nameA = a.display_name || a.login;
            const nameB = b.display_name || b.login;
            return nameA.localeCompare(nameB);
          });

        setStreamers(uniqueStreamers);
      }
    } catch (err) {
      console.error("Error fetching streamers:", err);
    }
  };

  const fetchStats = async () => {
    try {
      // Call the database function via RPC for efficient server-side counting
      const { data, error } = await supabase
        .rpc('get_global_stats');

      if (error) throw error;

      if (data) {
        setStats({
          streamers: data.streamers || 0,
          vods: data.vods || 0,
          matchups: data.matchups || 0
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Set default values on error
      setStats({
        streamers: 0,
        vods: 0,
        matchups: 0
      });
    }
  };

  const fetchInitialResults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("detection_search")
        .select("*")
        .order("actual_timestamp", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const mappedResults = mapToSearchResults(
          data as unknown as DetectionSearchView[]
        );
        setResults(mappedResults);
      }
    } catch (err) {
      console.error("Error fetching initial results:", err);
      setError("Failed to load recent results");
    } finally {
      setIsLoading(false);
    }
  };

  const mapToSearchResults = (data: DetectionSearchView[]): SearchResult[] => {
    return data.map((item) => ({
      id: item.detection_id,
      username: item.username,
      streamerName: item.streamer_display_name || "Unknown",
      streamerAvatar: item.streamer_avatar || "/placeholder.svg",
      date: item.actual_timestamp || new Date().toISOString(),
      vodUrl: item.vod_url || undefined,
      vodSourceId: item.vod_source_id || undefined,
      frameTimeSeconds: item.frame_time_seconds || undefined,
      confidence: item.confidence ?? undefined,
      rank: item.rank ?? undefined,
    }));
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build the base query using the view
      let queryBuilder = supabase.from("detection_search").select("*");

      // Add username search if provided
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike("username", `%${query}%`);
      }

      // Add streamer filter if selected
      if (selectedStreamer) {
        queryBuilder = queryBuilder.eq("streamer_id", selectedStreamer.id);
      }

      // Add date range filter if selected
      if (selectedDateRange !== "all") {
        const now = new Date();
        let dateFrom: Date;

        switch (selectedDateRange) {
          case "week":
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateFrom = new Date(0);
        }

        // Filter by actual_timestamp which includes frame offset
        queryBuilder = queryBuilder.gte(
          "actual_timestamp",
          dateFrom.toISOString()
        );
      }

      // Order by actual timestamp (VOD publish date + frame time)
      queryBuilder = queryBuilder
        .order("actual_timestamp", { ascending: false })
        .limit(50);

      const { data, error } = await queryBuilder;

      if (error) throw error;

      if (data) {
        const mappedResults = mapToSearchResults(
          data as unknown as DetectionSearchView[]
        );
        setResults(mappedResults);
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
  }, [searchQuery, selectedStreamer?.id, selectedDateRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled automatically by the useEffect above
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <h1 className="text-xl font-bold text-primary">Bazaar Ghost</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground hover:text-primary"
            >
              {theme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-1 py-3">
        {/* Stats Display */}
        <div className="text-xs text-muted-foreground font-mono mb-4 text-center">
          tracking {formatNumber(stats.streamers)} streamers · {formatNumber(stats.vods)} vods · {formatNumber(stats.matchups)} matchups
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8" autoComplete="off">
          <div className="flex gap-3 items-center mb-4">
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
                  className="w-[220px] justify-between h-14 border-border bg-card hover:bg-secondary hover:text-secondary-foreground"
                >
                  {selectedStreamer ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
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
                      <span className="truncate">
                        {selectedStreamer.display_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Any Streamer</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0">
                <Command>
                  <CommandInput placeholder="Search streamers..." />
                  <CommandList>
                    <CommandEmpty>No streamer found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedStreamer(null);
                          setOpenStreamerPopover(false);
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
                autoComplete="on"
                className="h-14 pl-12 pr-4 text-lg border-border bg-card placeholder:text-muted-foreground focus-visible:ring-primary"
              />
              {isLoading && (
                <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Date Range Select */}
            <Select
              value={selectedDateRange}
              onValueChange={setSelectedDateRange}
            >
              <SelectTrigger className="w-[150px] h-14 border-border bg-card">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-md border border-red-500 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && results.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Search Results */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.id}
                className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
              >
                <button
                  onClick={() => toggleExpand(result.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/50"
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage
                      src={result.streamerAvatar || "/placeholder.svg"}
                      alt={result.streamerName}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {result.streamerName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-foreground">
                    <span className="font-medium">{result.streamerName}</span>
                    <span className="text-muted-foreground"> vs </span>
                    {result.rank && (
                      <Image
                        src={`/${result.rank.toLowerCase()}.webp`}
                        alt={result.rank}
                        width={32}
                        height={32}
                        className="mr-1 inline-block"
                      />
                    )}
                    <span className="font-medium">{result.username}</span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="shrink-0 text-sm text-muted-foreground">
                      {new Date(result.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {result.confidence && (
                      <div className="text-xs text-muted-foreground">
                        {Math.round(result.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded VOD Embed */}
                {expandedId === result.id &&
                  result.vodSourceId &&
                  result.frameTimeSeconds !== undefined && (
                    <div className="border-t border-border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Force iframe reload to replay at matchup timestamp
                            const iframe = document.getElementById(
                              `vod-${result.id}`
                            ) as HTMLIFrameElement;
                            if (iframe) {
                              const src = iframe.src;
                              iframe.src = "";
                              setTimeout(() => {
                                iframe.src = src;
                              }, 0);
                            }
                          }}
                          className="text-foreground"
                        >
                          Replay at Matchup
                        </Button>
                      </div>
                      <div className="aspect-video w-full rounded-md overflow-hidden">
                        <iframe
                          id={`vod-${result.id}`}
                          src={`https://player.twitch.tv/?video=${
                            result.vodSourceId
                          }&parent=${
                            typeof window !== "undefined"
                              ? window.location.hostname
                              : "localhost"
                          }&time=${result.frameTimeSeconds}s&autoplay=true`}
                          height="100%"
                          width="100%"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {searchQuery
              ? `No results found for "${searchQuery}"`
              : "No matches found. Try searching for a username."}
          </div>
        )}
      </div>
    </div>
  );
}
