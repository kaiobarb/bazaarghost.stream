"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Search, Moon, Sun, Loader2 } from "lucide-react";
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
import Image from "next/image";
import { supabase, type DetectionSearchView, type Streamer } from "@/lib/supabase";

interface SearchResult {
  id: string;
  streamerName: string;
  streamerAvatar: string;
  username: string;
  date: string;
  vodUrl?: string;
  confidence?: number;
  rank?: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedStreamer, setSelectedStreamer] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load theme from localStorage (client-side only)
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
    }

    fetchStreamers();
    fetchInitialResults();
  }, [supabase]);

  const fetchStreamers = async () => {
    try {
      const { data, error } = await supabase
        .from("streamers")
        .select("*")
        .eq("processing_enabled", true)
        .order("login", { ascending: true });

      if (error) throw error;
      if (data) {
        setStreamers(data);
      }
    } catch (err) {
      console.error("Error fetching streamers:", err);
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
      streamerName: item.streamer_login || "Unknown",
      streamerAvatar: item.streamer_avatar || "/placeholder.svg",
      date: item.actual_timestamp || new Date().toISOString(),
      vodUrl: item.vod_url || undefined,
      confidence: item.confidence ?? undefined,
      rank: item.rank ?? undefined,
    }));
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build the base query using the view
      let queryBuilder = supabase
        .from("detection_search")
        .select("*");

      // Add username search if provided
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike("username", `%${query}%`);
      }

      // Add streamer filter if selected
      if (selectedStreamer !== "all") {
        const selectedStreamerId = streamers.find(
          (s) => s.login === selectedStreamer
        )?.id;
        if (selectedStreamerId) {
          queryBuilder = queryBuilder.eq("streamer_id", selectedStreamerId);
        }
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
  }, [searchQuery, selectedStreamer, selectedDateRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled automatically by the useEffect above
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-background" : "bg-white"}`}
    >
      <nav
        className={`border-b ${
          isDarkMode ? "border-border bg-card" : "border-gray-200 bg-gray-50"
        }`}
      >
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
              <h1
                className={`text-xl font-bold ${
                  isDarkMode ? "text-primary" : "text-gray-900"
                }`}
              >
                Bazaar Ghost
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={
                isDarkMode
                  ? "text-foreground hover:text-primary"
                  : "text-gray-700 hover:text-gray-900"
              }
            >
              {isDarkMode ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-1 py-3">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8" autoComplete="off">
          <div className="relative mb-4">
            <Search
              className={`absolute left-4 top-1/2 size-5 -translate-y-1/2 ${
                isDarkMode ? "text-muted-foreground" : "text-gray-400"
              }`}
            />
            <Input
              type="text"
              placeholder="Enter username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="on"
              className={`h-14 pl-12 pr-4 text-lg ${
                isDarkMode
                  ? "border-border bg-card placeholder:text-muted-foreground focus-visible:ring-primary"
                  : "border-gray-300 bg-white placeholder:text-gray-400 focus-visible:ring-gray-900"
              }`}
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex gap-3">
            <Select
              value={selectedStreamer}
              onValueChange={setSelectedStreamer}
            >
              <SelectTrigger
                className={`w-[200px] ${
                  isDarkMode
                    ? "border-border bg-card"
                    : "border-gray-300 bg-white"
                }`}
              >
                <SelectValue placeholder="All Streamers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streamers</SelectItem>
                {streamers.map((streamer) => (
                  <SelectItem key={streamer.id} value={streamer.login}>
                    {streamer.display_name || streamer.login}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDateRange}
              onValueChange={setSelectedDateRange}
            >
              <SelectTrigger
                className={`w-[200px] ${
                  isDarkMode
                    ? "border-border bg-card"
                    : "border-gray-300 bg-white"
                }`}
              >
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
                className={`overflow-hidden rounded-lg border transition-colors ${
                  isDarkMode
                    ? "border-border bg-card hover:border-primary/50"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <button
                  onClick={() => toggleExpand(result.id)}
                  className={`flex w-full items-center gap-4 p-4 text-left transition-colors ${
                    isDarkMode ? "hover:bg-secondary/50" : "hover:bg-gray-50"
                  }`}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage
                      src={result.streamerAvatar || "/placeholder.svg"}
                      alt={result.streamerName}
                    />
                    <AvatarFallback
                      className={
                        isDarkMode
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-900 text-white"
                      }
                    >
                      {result.streamerName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 ${
                      isDarkMode ? "text-foreground" : "text-gray-900"
                    }`}
                  >
                    <span className="font-medium">{result.streamerName}</span>
                    <span
                      className={
                        isDarkMode ? "text-muted-foreground" : "text-gray-500"
                      }
                    >
                      {" "}
                      vs{" "}
                    </span>
                    <span className="font-medium">{result.username}</span>
                    {result.rank && (
                      <span className="ml-2 text-xs uppercase text-muted-foreground">
                        ({result.rank})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`shrink-0 text-sm ${
                        isDarkMode ? "text-muted-foreground" : "text-gray-500"
                      }`}
                    >
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
                {expandedId === result.id && result.vodUrl && (
                  <div
                    className={`border-t p-4 ${
                      isDarkMode ? "border-border" : "border-gray-200"
                    }`}
                  >
                    <div className="mb-2">
                      <a
                        href={result.vodUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Open VOD on Twitch →
                      </a>
                    </div>
                    <div
                      className={`aspect-video w-full rounded-md flex items-center justify-center ${
                        isDarkMode ? "bg-secondary/50" : "bg-gray-100"
                      }`}
                    >
                      <p
                        className={
                          isDarkMode ? "text-muted-foreground" : "text-gray-500"
                        }
                      >
                        Twitch VOD embed (click link above to watch)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <div
            className={`py-12 text-center ${
              isDarkMode ? "text-muted-foreground" : "text-gray-500"
            }`}
          >
            {searchQuery
              ? `No results found for "${searchQuery}"`
              : "No matches found. Try searching for a username."}
          </div>
        )}
      </div>
    </div>
  );
}
