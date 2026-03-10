import type React from "react";
import { Suspense } from "react";
import { EmbedProvider } from "@/components/embed";
import SearchPanel from "@/components/search";

/**
 * Embed layout for search and embed routes.
 *
 * Wraps content in {@link EmbedProvider} and renders the
 * {@link SearchPanel} (results + resizable panels). The navbar, stats
 * strip, and search header are rendered in the root layout.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EmbedProvider>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* children renders GhostLoader (null) on embed routes, nothing on search routes */}
        {children}
        <Suspense>
          <SearchPanel />
        </Suspense>
      </div>
    </EmbedProvider>
  );
}
