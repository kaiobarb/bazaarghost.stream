"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  LeaderboardEntry,
  LeaderboardBySeason,
  Season,
} from "@/lib/leaderboard-data";

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
  /** All seasons, sorted most-recent first. */
  seasons: Season[];
  /** Leaderboard entries keyed by season ID. */
  leaderboardBySeason: LeaderboardBySeason;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Rating formula breakdown shared between mobile (collapsible) and desktop. */
function RatingFormulaContent() {
  return (
    <>
      <p className="font-mono leading-relaxed">
        &Delta; = (W &minus; R/500 &times; 5) &times; 5 + B
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        <dt className="font-mono">W</dt>
        <dd>Wins this cycle</dd>
        <dt className="font-mono">R</dt>
        <dd>Current rating</dd>
        <dt className="font-mono">500</dt>
        <dd>Base rating</dd>
        <dt className="font-mono">5</dt>
        <dd>Neutral wins &amp; scale factor</dd>
        <dt className="font-mono">B</dt>
        <dd>+5 bonus at 10 wins</dd>
      </dl>
    </>
  );
}

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
 * Left column: heading, season picker, search input, result count, and
 * a rating formula explanation.
 * Right column: fixed column headers and a virtualized scrollable list of
 * player rows. On mobile the columns stack vertically.
 *
 * All data is server-fetched and passed as props — no client-side API calls.
 *
 * @param seasons - All available seasons.
 * @param leaderboardBySeason - Pre-fetched leaderboard data for every season.
 */
export function LeaderboardTable({
  seasons,
  leaderboardBySeason,
}: LeaderboardTableProps) {
  const defaultSeason = seasons[0]?.id ?? 1;
  const [seasonId, setSeasonId] = useState(defaultSeason);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("Position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const scrollRef = useRef<HTMLDivElement>(null);

  // -- Derived data --------------------------------------------------------

  const data = leaderboardBySeason[seasonId] ?? [];

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
    setSeasonId(Number(value));
    setSearchQuery("");
    setSortField("Position");
    setSortDirection("asc");
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

        {/* Season + search: single row on mobile, stacked on desktop */}
        <div className="flex gap-2 md:flex-col md:gap-4">
          <Select value={String(seasonId)} onValueChange={handleSeasonChange}>
            <SelectTrigger
              className="h-9 w-[130px] shrink-0 md:w-full"
              size="default"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-border bg-card pl-9"
            />
          </div>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          {sortedData.length.toLocaleString()} player
          {sortedData.length !== 1 ? "s" : ""}
        </p>

        {/* Rating formula: collapsible on mobile, always open on desktop */}
        <div className="rounded-md border border-border bg-card/50 text-xs text-muted-foreground">
          {/* Mobile: collapsible details/summary */}
          <details className="md:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 p-3 font-medium text-foreground/80 [&>svg]:open:rotate-90">
              <ChevronRight className="size-3.5 transition-transform" />
              Rating formula
            </summary>
            <div className="border-t border-border px-3 pb-3 pt-2">
              <RatingFormulaContent />
            </div>
          </details>
          {/* Desktop: always visible */}
          <div className="hidden p-3 md:block">
            <p className="mb-2 font-medium text-foreground/80">
              Rating formula
            </p>
            <RatingFormulaContent />
          </div>
        </div>
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
