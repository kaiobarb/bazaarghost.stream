"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSearchUrl } from "./hooks/use-search-url";
import { useStreamerOptions } from "./hooks/use-streamer-options";
import { SearchHeader } from "./search-header";

/** Routes where the search panel with results is active. */
const SEARCH_ROUTES = ["/search", "/vods", "/streamers", "/ghost"];

/**
 * Props for {@link GlobalSearchHeader}.
 */
interface GlobalSearchHeaderProps {
  showSearchTabs: boolean;
}

/**
 * Site-wide search header rendered in the root layout.
 *
 * Uses the same {@link useSearchUrl} and {@link useStreamerOptions} hooks as
 * the in-app {@link SearchPanel}, and renders the shared {@link SearchHeader}
 * component.
 *
 * **On search pages** (`/search`, `/vods`, `/streamers`): input changes
 * update the URL in-place (normal behaviour driven by `useSearchUrl`).
 *
 * **On all other pages**: any input change or streamer selection navigates
 * to `/search` with the appropriate query params, so the user lands on the
 * results page.
 */
export function GlobalSearchHeader({
  showSearchTabs,
}: GlobalSearchHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    searchMode,
    routeContext,
    queryParam,
    effectiveStreamer,
    inputValue,
    handleInputChange: baseHandleInputChange,
    replaceParams,
  } = useSearchUrl();

  const {
    streamerOptions,
    resolvedStreamer,
    openStreamerPopover,
    setOpenStreamerPopover,
    handleSelectStreamer: baseHandleSelectStreamer,
  } = useStreamerOptions({
    effectiveStreamer,
    searchMode,
    queryParam,
    replaceParams,
    routePathStreamer: routeContext.pathStreamer,
  });

  const isOnSearchPage = SEARCH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  // ---- Ref for height measurement (mobile sheet positioning) ----
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * On search pages, delegate to the normal handler (replaces URL in-place).
   * On other pages, navigate to `/search?q=...`.
   */
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [localInput, setLocalInput] = useState("");
  const isRedirecting = !isOnSearchPage;

  const handleInputChange = useCallback(
    (value: string) => {
      if (isOnSearchPage) {
        baseHandleInputChange(value);
        return;
      }
      // On non-search pages: local state + debounced navigate
      setLocalInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value) {
          const params = new URLSearchParams();
          params.set("q", value);
          router.push(`/search?${params.toString()}`, { scroll: false });
        }
      }, 300);
    },
    [isOnSearchPage, baseHandleInputChange, router]
  );

  /** On non-search pages, selecting a streamer navigates to /search. */
  const handleSelectStreamer = useCallback(
    (opt: Parameters<typeof baseHandleSelectStreamer>[0]) => {
      if (isOnSearchPage) {
        baseHandleSelectStreamer(opt);
        return;
      }
      const params = new URLSearchParams();
      if (opt?.streamer_display_name) {
        params.set("streamer", opt.streamer_display_name);
      }
      router.push(`/search${params.toString() ? `?${params}` : ""}`, {
        scroll: false,
      });
    },
    [isOnSearchPage, baseHandleSelectStreamer, router]
  );

  /** Mode tab changes always navigate. */
  const handleModeChange = useCallback(
    (href: string) => {
      const url = queryParam
        ? `${href}?q=${encodeURIComponent(queryParam)}`
        : href;
      router.push(url);
    },
    [router, queryParam]
  );

  return (
    <SearchHeader
      ref={headerRef}
      searchMode={searchMode}
      showSearchTabs={showSearchTabs}
      inputValue={isRedirecting ? localInput : inputValue}
      isLoading={false}
      onInputChange={handleInputChange}
      onModeChange={handleModeChange}
      streamerOptions={streamerOptions}
      resolvedStreamer={resolvedStreamer}
      effectiveStreamer={effectiveStreamer}
      openStreamerPopover={openStreamerPopover}
      onOpenStreamerPopover={setOpenStreamerPopover}
      onSelectStreamer={handleSelectStreamer}
    />
  );
}
