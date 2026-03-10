"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeaderboardEntry } from "@/lib/leaderboard-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed row height in pixels. */
const ROW_HEIGHT = 40;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = "Position" | "Rating";
type SortDirection = "asc" | "desc";

interface LeaderboardTableProps {
  /** Full leaderboard dataset for the selected season. */
  data: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Sort direction indicator icon for a column header. */
function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
}) {
  if (activeField !== field)
    return <ChevronsUpDown className="ml-1 size-3 opacity-50" />;
  return direction === "asc" ? (
    <ChevronUp className="ml-1 size-3" />
  ) : (
    <ChevronDown className="ml-1 size-3" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dual-column virtualized leaderboard.
 *
 * Left column: heading, season picker, search input, and result count.
 * Right column: fixed column headers and a virtualized scrollable list of
 * player rows. On mobile the columns stack vertically.
 *
 * @param data - The full leaderboard dataset for the selected season.
 */
export function LeaderboardTable({ data }: LeaderboardTableProps) {
  const [season, setSeason] = useState("12");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("Position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const scrollRef = useRef<HTMLDivElement>(null);

  // -- Derived data --------------------------------------------------------

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((entry) => entry.Username.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [filteredData, sortField, sortDirection]);

  // -- Virtualizer ---------------------------------------------------------

  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // -- Handlers ------------------------------------------------------------

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection(field === "Rating" ? "desc" : "asc");
      }
    },
    [sortField]
  );

  const handleSeasonChange = useCallback((value: string) => {
    setSeason(value);
    setSearchQuery("");
  }, []);

  // -- Render --------------------------------------------------------------

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
      {/* ----------------------------------------------------------------- */}
      {/* Left column: controls                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex shrink-0 flex-col gap-4 md:w-64">
        <h1 className="font-serif text-2xl font-bold">Leaderboard</h1>

        <Select value={season} onValueChange={handleSeasonChange}>
          <SelectTrigger className="w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => 12 - i).map((s) => (
              <SelectItem key={s} value={String(s)}>
                Season {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 border-border bg-card pl-9"
          />
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          {sortedData.length.toLocaleString()} player
          {sortedData.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right column: virtualized table                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 flex-col rounded-md border border-border">
        {/* Fixed column headers */}
        <div className="flex shrink-0 items-center border-b border-border bg-muted/30 text-sm">
          <div className="w-[72px] px-3 py-2">
            <button
              onClick={() => handleSort("Position")}
              className="flex items-center font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              #{" "}
              <SortIcon
                field="Position"
                activeField={sortField}
                direction={sortDirection}
              />
            </button>
          </div>
          <div className="flex-1 px-3 py-2 font-medium text-muted-foreground">
            Player
          </div>
          <div className="w-[100px] px-3 py-2 text-right">
            <button
              onClick={() => handleSort("Rating")}
              className="ml-auto flex items-center font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Rating{" "}
              <SortIcon
                field="Rating"
                activeField={sortField}
                direction={sortDirection}
              />
            </button>
          </div>
        </div>

        {/* Virtualized rows */}
        {sortedData.length > 0 ? (
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            <div
              className="relative w-full"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualRow) => {
                const entry = sortedData[virtualRow.index];
                return (
                  <div
                    key={entry.AccountId}
                    className="absolute inset-x-0 top-0 flex items-center border-b border-border/50 transition-colors hover:bg-muted/50"
                    style={{
                      height: `${ROW_HEIGHT}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="w-[72px] px-3 font-mono text-sm text-muted-foreground">
                      {entry.Position}
                    </div>
                    <div className="flex-1 truncate px-3 text-sm font-medium">
                      <Link
                        href={`/ghost/${encodeURIComponent(entry.Username)}`}
                        className="hover:text-primary hover:underline"
                      >
                        {entry.Username}
                      </Link>
                    </div>
                    <div className="w-[100px] px-3 text-right font-mono text-sm">
                      {entry.Rating}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {searchQuery
              ? `No players found for "${searchQuery}"`
              : "No data available"}
          </div>
        )}
      </div>
    </div>
  );
}
