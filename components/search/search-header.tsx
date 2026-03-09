"use client";

import { forwardRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreamerPicker } from "./streamer-picker";
import { SearchInput } from "./search-input";
import { modeOptions } from "./constants";
import type { SearchMode, StreamerOption, ResolvedStreamer } from "./types";

/**
 * Props for {@link SearchHeader}.
 */
interface SearchHeaderProps {
  searchMode: SearchMode;
  showSearchTabs: boolean;
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onModeChange: (href: string) => void;

  // Streamer picker state (shared between ghost & vod modes)
  streamerOptions: StreamerOption[];
  resolvedStreamer: ResolvedStreamer | null;
  effectiveStreamer: string | null;
  openStreamerPopover: boolean;
  onOpenStreamerPopover: (open: boolean) => void;
  onSelectStreamer: (opt: StreamerOption | null) => void;
}

/**
 * Top section of the search panel containing mode tabs and mode-specific
 * input controls.
 *
 * - **Ghost mode**: streamer picker + "vs" + username search input (stacked
 *   when narrow, inline when wide via `@container` queries).
 * - **VOD mode**: streamer picker + VOD title search input.
 * - **Streamers mode**: streamer name search input only.
 *
 * Accepts a forwarded ref so the orchestrator can measure its height (needed
 * to position the mobile bottom sheet below the header).
 */
export const SearchHeader = forwardRef<HTMLDivElement, SearchHeaderProps>(
  function SearchHeader(
    {
      searchMode,
      showSearchTabs,
      inputValue,
      isLoading,
      onInputChange,
      onModeChange,
      streamerOptions,
      resolvedStreamer,
      effectiveStreamer,
      openStreamerPopover,
      onOpenStreamerPopover,
      onSelectStreamer,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className="relative z-50 flex flex-col gap-3 bg-background p-1"
      >
        <div className="@container flex flex-col gap-2">
          {/* Mode tabs — hidden when feature flag is off */}
          {showSearchTabs && (
            <Tabs
              value={searchMode}
              onValueChange={(v: string) => {
                const opt = modeOptions.find((o) => o.value === v);
                if (opt) onModeChange(opt.href);
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
          )}

          {/* Search inputs — vary by mode */}
          {searchMode === "ghosts" ? (
            <div className="flex flex-col items-stretch gap-2 @[20rem]:flex-row @[20rem]:items-center">
              <StreamerPicker
                streamerOptions={streamerOptions}
                resolvedStreamer={resolvedStreamer}
                effectiveStreamer={effectiveStreamer}
                open={openStreamerPopover}
                onOpenChange={onOpenStreamerPopover}
                onSelect={onSelectStreamer}
                triggerClassName="@[20rem]:w-auto @[20rem]:shrink-0"
              />
              <span className="shrink-0 self-center text-xs font-medium text-muted-foreground">
                vs
              </span>
              <SearchInput
                value={inputValue}
                onChange={onInputChange}
                placeholder="Ghost username..."
                isLoading={isLoading}
              />
            </div>
          ) : searchMode === "vods" ? (
            <>
              <StreamerPicker
                streamerOptions={streamerOptions}
                resolvedStreamer={resolvedStreamer}
                effectiveStreamer={effectiveStreamer}
                open={openStreamerPopover}
                onOpenChange={onOpenStreamerPopover}
                onSelect={onSelectStreamer}
              />
              <SearchInput
                value={inputValue}
                onChange={onInputChange}
                placeholder="Search VODs..."
                isLoading={isLoading}
              />
            </>
          ) : (
            <SearchInput
              value={inputValue}
              onChange={onInputChange}
              placeholder="Search streamers..."
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    );
  }
);
