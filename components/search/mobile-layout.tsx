"use client";

import type { ReactNode } from "react";
import { EmbedDrawer } from "@/components/embed-drawer";

/**
 * Props for {@link MobileLayout}.
 */
interface MobileLayoutProps {
  searchHeader: ReactNode;
  searchResults: ReactNode;
  searchHeaderHeight: number;
}

/**
 * Mobile layout — full-width column with the search header, results, and
 * a CSS bottom-sheet embed drawer.
 *
 * The `searchHeaderHeight` is passed to the {@link EmbedDrawer} so it can
 * position its snap point just below the header.
 */
export function MobileLayout({
  searchHeader,
  searchResults,
  searchHeaderHeight,
}: MobileLayoutProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
      {searchHeader}
      {searchResults}
      <EmbedDrawer headerHeight={searchHeaderHeight} />
    </div>
  );
}
