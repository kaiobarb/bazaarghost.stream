"use client";

import type { ReactNode } from "react";
import { EmbedDrawer } from "@/components/embed";

/**
 * Props for {@link MobileLayout}.
 */
interface MobileLayoutProps {
  searchResults: ReactNode;
}

/**
 * Mobile layout — full-width column with search results and a CSS
 * bottom-sheet embed drawer.
 *
 * The search header is rendered in the root layout above all route
 * content, so this component only handles the results list and drawer.
 */
export function MobileLayout({ searchResults }: MobileLayoutProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
      {searchResults}
      <EmbedDrawer />
    </div>
  );
}
