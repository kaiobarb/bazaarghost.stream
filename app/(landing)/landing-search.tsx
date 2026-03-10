"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { SearchInput } from "@/components/search/search-input";
import { StreamerPicker } from "@/components/search/streamer-picker";
import type {
  StreamerOption,
  ResolvedStreamer,
} from "@/components/search/types";

/**
 * Lightweight search header for the landing page.
 *
 * Renders the same streamer picker + ghost search input as the app's
 * {@link SearchHeader}, but instead of driving in-page results it
 * navigates to `/search` with the appropriate query params when
 * the user starts typing or selects a streamer.
 */
export function LandingSearch() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Streamer options (same fetch as useStreamerOptions) ----
  const [streamerOptions, setStreamerOptions] = useState<StreamerOption[]>([]);
  const [resolvedStreamer, setResolvedStreamer] =
    useState<ResolvedStreamer | null>(null);
  const [selectedStreamer, setSelectedStreamer] = useState<string | null>(null);
  const [openPopover, setOpenPopover] = useState(false);

  useEffect(() => {
    supabase
      .from("streamers")
      .select(
        "streamer_id:id, streamer_display_name:display_name, streamer_avatar:avatar"
      )
      .order("display_name")
      .then(({ data }) => {
        if (data) setStreamerOptions(data as unknown as StreamerOption[]);
      });
  }, []);

  // Resolve selected streamer to display data
  useEffect(() => {
    if (!selectedStreamer) {
      setResolvedStreamer(null);
      return;
    }
    const match = streamerOptions.find(
      (s) =>
        s.streamer_display_name?.toLowerCase() ===
        selectedStreamer.toLowerCase()
    );
    if (match) {
      setResolvedStreamer({
        id: match.streamer_id,
        displayName: match.streamer_display_name ?? "",
        avatar: match.streamer_avatar ?? "",
      });
    }
  }, [selectedStreamer, streamerOptions]);

  /** Build the /search URL with current filters. */
  const buildSearchUrl = useCallback(
    (overrides?: { q?: string | null; streamer?: string | null }) => {
      const params = new URLSearchParams();
      const q = overrides?.q !== undefined ? overrides.q : inputValue;
      if (q) params.set("q", q);
      const streamer =
        overrides?.streamer !== undefined
          ? overrides.streamer
          : selectedStreamer;
      if (streamer) params.set("streamer", streamer);
      const qs = params.toString();
      return `/search${qs ? `?${qs}` : ""}`;
    },
    [inputValue, selectedStreamer]
  );

  /** Navigate to /search when user types. */
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value) {
          router.push(buildSearchUrl({ q: value }), { scroll: false });
        }
      }, 300);
    },
    [router, buildSearchUrl]
  );

  /** Navigate to /search when user picks a streamer. */
  const handleSelectStreamer = useCallback(
    (opt: StreamerOption | null) => {
      const name = opt?.streamer_display_name ?? null;
      setSelectedStreamer(name);
      setOpenPopover(false);
      router.push(buildSearchUrl({ streamer: name }), { scroll: false });
    },
    [router, buildSearchUrl]
  );

  return (
    <div className="@container flex flex-col gap-2">
      <div className="flex flex-col items-stretch gap-2 @[20rem]:flex-row @[20rem]:items-center">
        <StreamerPicker
          streamerOptions={streamerOptions}
          resolvedStreamer={resolvedStreamer}
          effectiveStreamer={selectedStreamer}
          open={openPopover}
          onOpenChange={setOpenPopover}
          onSelect={handleSelectStreamer}
          triggerClassName="@[20rem]:w-auto @[20rem]:shrink-0"
        />
        <span className="shrink-0 self-center text-xs font-medium text-muted-foreground">
          vs
        </span>
        <SearchInput
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Ghost username..."
        />
      </div>
    </div>
  );
}
