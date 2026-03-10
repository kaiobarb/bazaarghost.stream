"use client";

import { type ReactNode, useCallback, useRef } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EmbedPanel } from "@/components/embed-panel";

/** Duration (ms) for the panel expand/collapse CSS transition. */
const TRANSITION_MS = 100;

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
 * Left panel (30% default, 200px min): search results list.
 * Right panel (70% default, 400px min): Twitch embed player or an
 * empty-state placeholder when no VOD is loaded.
 *
 * Both panels are collapsible to 0%. Clicking the drag handle when
 * either panel is collapsed expands both panels back to their defaults
 * with a smooth CSS transition.
 *
 * The search header is rendered above this component at full viewport
 * width by the {@link SearchPanel} orchestrator.
 */
export function DesktopLayout({
  searchResults,
  embedVisible,
}: DesktopLayoutProps) {
  const searchPanelRef = useRef<PanelImperativeHandle>(null);
  const embedPanelRef = useRef<PanelImperativeHandle>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  /**
   * Temporarily add a CSS transition class to all panels so that
   * programmatic expand/collapse animates smoothly. The class is
   * removed after the transition completes to avoid interfering
   * with drag-based resizing.
   */
  const animateTransition = useCallback((fn: () => void) => {
    const group = groupRef.current;
    if (!group) {
      fn();
      return;
    }
    group.classList.add("animate-panels");
    fn();
    setTimeout(() => group.classList.remove("animate-panels"), TRANSITION_MS);
  }, []);

  /** If either panel is collapsed, expand it back to default on click. */
  const handleHandleClick = useCallback(() => {
    const searchCollapsed = searchPanelRef.current?.isCollapsed();
    const embedCollapsed = embedPanelRef.current?.isCollapsed();
    if (!searchCollapsed && !embedCollapsed) return;
    animateTransition(() => {
      if (searchCollapsed) searchPanelRef.current?.expand();
      if (embedCollapsed) embedPanelRef.current?.expand();
    });
  }, [animateTransition]);

  return (
    <ResizablePanelGroup
      elementRef={groupRef}
      orientation="horizontal"
      className="min-h-0 w-full flex-1 [&.animate-panels_[data-slot=resizable-panel]]:transition-[flex-grow] [&.animate-panels_[data-slot=resizable-panel]]:duration-100 [&.animate-panels_[data-slot=resizable-panel]]:ease-in-out"
    >
      {/* Search results panel — collapsible to 0% to fully reveal embed */}
      <ResizablePanel
        panelRef={searchPanelRef}
        defaultSize={30}
        minSize={200}
        collapsible
        collapsedSize={0}
        className="flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        {searchResults}
      </ResizablePanel>

      <ResizableHandle withHandle onClick={handleHandleClick} />

      {/* Embed / main content — collapsible to 0% to fully reveal search */}
      <ResizablePanel
        panelRef={embedPanelRef}
        defaultSize={70}
        minSize={400}
        collapsible
        collapsedSize={0}
        className="overflow-hidden bg-background"
      >
        <div className="flex h-full flex-col">
          <EmbedPanel />
          {/* {!embedVisible && (
            <div className="flex flex-1 items-center justify-center border border-dashed border-border bg-card/30 px-6">
              <p className="text-center text-sm text-muted-foreground">
                Select a result to load a VOD embed.
              </p>
            </div>
          )} */}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
