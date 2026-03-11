"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSearchUrl } from "./hooks/use-search-url";
import { useStreamerOptions } from "./hooks/use-streamer-options";
import { usePanelControls } from "./panel-context";
import { SearchHeader } from "./search-header";

/**
 * Routes where the search panel with results is active.
 * Embed routes (`/:streamer`, `/:streamer/:vodId`, `/:streamer/:vodId/:ghost`)
 * are also handled — typing there updates `?q=` in-place via
 * {@link useSearchUrl} rather than redirecting to `/search`.
 */
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
 * **On search / embed pages** (`/search`, `/vods`, `/streamers`, and all
 * `/:streamer/*` routes under the `(embed)` layout): input changes update
 * the URL in-place and auto-expand the search results panel if collapsed.
 *
 * **On all other pages** (landing, contact, etc.): any input change or
 * streamer selection navigates to `/search` with the appropriate query
 * params, so the user lands on the results page.
 */
export function GlobalSearchHeader({
  showSearchTabs,
}: GlobalSearchHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { expandSearch, isSearchCollapsed } = usePanelControls();

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

  // Embed routes (/:streamer, /:streamer/:vodId, /:streamer/:vodId/:ghost)
  // are under the (embed) layout and share the SearchPanel — typing there
  // should update ?q= in-place, not redirect to /search.
  const isOnSearchPage = SEARCH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
  const isOnEmbedRoute = !!(routeContext.pathStreamer && !isOnSearchPage);
  const hasSearchPanel = isOnSearchPage || isOnEmbedRoute;

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
   * On pages with the search panel, delegate to the normal handler
   * (replaces URL in-place) and expand the search panel if collapsed.
   * On other pages, navigate to `/search?q=...`.
   */
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [localInput, setLocalInput] = useState("");
  const isRedirecting = !hasSearchPanel;

  const handleInputChange = useCallback(
    (value: string) => {
      if (hasSearchPanel) {
        // Auto-expand search panel when typing while collapsed
        if (value && isSearchCollapsed()) {
          expandSearch();
        }
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
    [
      hasSearchPanel,
      isSearchCollapsed,
      expandSearch,
      baseHandleInputChange,
      router,
    ]
  );

  /** On non-search pages, selecting a streamer navigates to /search. */
  const handleSelectStreamer = useCallback(
    (opt: Parameters<typeof baseHandleSelectStreamer>[0]) => {
      if (hasSearchPanel) {
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
    [hasSearchPanel, baseHandleSelectStreamer, router]
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
