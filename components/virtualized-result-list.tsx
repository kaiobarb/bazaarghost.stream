"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed row height (72px card + 8px gap) */
const ROW_HEIGHT = 72;
const ROW_GAP = 8;
const ITEM_SIZE = ROW_HEIGHT + ROW_GAP;

/** How far from the bottom (in px) to trigger fetching the next batch */
const LOAD_MORE_PX = 400;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VirtualizedResultListProps<T> {
  /** The accumulated items array */
  items: T[];
  /** Total count from the server (used for result count display) */
  totalCount: number;
  /** Unique key extractor */
  getItemKey: (item: T) => string | number;
  /** Render a single row. The item and its index are provided. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Called when the user scrolls near the bottom and more items are available */
  onLoadMore: () => void;
  /** Whether a fetch is currently in progress */
  isLoadingMore: boolean;
  /** Whether there are more items to fetch */
  hasMore: boolean;
  /** Overscan count — number of rows to render outside the visible area */
  overscan?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VirtualizedResultList<T>({
  items,
  totalCount,
  getItemKey,
  renderItem,
  onLoadMore,
  isLoadingMore,
  hasMore,
  overscan = 5,
}: VirtualizedResultListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Ref-based guard prevents duplicate fetches between scroll events
  // (React state updates are async, so isLoadingMore can be stale in the handler)
  const loadingRef = useRef(false);
  loadingRef.current = isLoadingMore;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_SIZE,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll: listen for scroll events on our own container
  const checkLoadMore = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingRef.current) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < LOAD_MORE_PX) {
      loadingRef.current = true;
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkLoadMore, { passive: true });
    return () => el.removeEventListener("scroll", checkLoadMore);
  }, [checkLoadMore]);

  if (items.length === 0) return null;

  const totalSize = virtualizer.getTotalSize();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Result count — inset to look recessed between header border and results */}
      <p className="shrink-0 border-b border-sidebar-border px-4 py-1 font-mono text-xs text-muted-foreground ">
        {items.length.toLocaleString()}
        {totalCount > items.length
          ? ` / ${totalCount.toLocaleString()}`
          : ""}{" "}
        result{totalCount !== 1 ? "s" : ""}
      </p>

      {/* Scrollable virtual list — pr-2 leaves gutter for scrollbar */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto pl-4 pr-2 pt-2"
      >
        <div className="relative w-full" style={{ height: `${totalSize}px` }}>
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;

            return (
              <div
                key={getItemKey(item)}
                className="absolute left-0 top-0 w-full pr-2"
                style={{
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderItem(item, virtualRow.index)}
              </div>
            );
          })}
        </div>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* End of list */}
        {!hasMore && items.length > 0 && (
          <p className="py-4 text-center font-mono text-xs text-muted-foreground">
            end of results
          </p>
        )}
      </div>
    </div>
  );
}
