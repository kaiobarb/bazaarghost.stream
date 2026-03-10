"use client";

import type { ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EmbedPanel } from "@/components/embed-panel";

/**
 * Props for {@link DesktopLayout}.
 */
interface DesktopLayoutProps {
  searchResults: ReactNode;
  embedVisible: boolean;
}

/**
 * Desktop two-panel layout using `react-resizable-panels`.
 *
 * Left panel (30% default, 20-50% range): search results list.
 * Right panel (70% default, 40%+ range): Twitch embed player or an
 * empty-state placeholder when no VOD is loaded.
 *
 * The search header is rendered above this component at full viewport
 * width by the {@link SearchPanel} orchestrator.
 */
export function DesktopLayout({
  searchResults,
  embedVisible,
}: DesktopLayoutProps) {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 w-full flex-1"
    >
      {/* Search results panel */}
      <ResizablePanel
        defaultSize="30%"
        minSize="20%"
        maxSize="50%"
        className="flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        {searchResults}
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Embed / main content */}
      <ResizablePanel
        defaultSize="70%"
        minSize="40%"
        className="overflow-hidden bg-background"
      >
        <div className="flex h-full flex-col">
          <EmbedPanel />
          {!embedVisible && (
            <div className="flex flex-1 items-center justify-center border border-dashed border-border bg-card/30 px-6">
              <p className="text-center text-sm text-muted-foreground">
                Select a result to load a VOD embed.
              </p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
