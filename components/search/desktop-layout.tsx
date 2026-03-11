"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EmbedPanel } from "@/components/embed";
import { useRegisterPanelControls } from "./panel-context";
import { deriveRouteContext } from "./lib/route-utils";

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
 * On ghost matchup routes (`/:streamer/:vodId/:ghost`), the search panel
 * starts collapsed so the viewer sees the clip/fight first. Typing in
 * the search bar or clicking the handle will expand it.
 *
 * The search header is rendered above this component at full viewport
 * width by the {@link SearchPanel} orchestrator.
 */
export function DesktopLayout({
  searchResults,
  embedVisible,
}: DesktopLayoutProps) {
  const pathname = usePathname();
  const searchPanelRef = useRef<PanelImperativeHandle>(null);
  const embedPanelRef = useRef<PanelImperativeHandle>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  // Captures the pathname at mount time so we can distinguish "user landed
  // here from an external link" (should auto-collapse) from "user navigated
  // here via an in-app ghost click" (should NOT auto-collapse).
  const initialPathnameRef = useRef(pathname);

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

  // ---- Auto-collapse search panel on ghost matchup routes ----
  // Only when the user *landed* directly on this route (e.g. shared link).
  // If they navigated here by clicking a ghost result in the search panel,
  // the panel should stay open.
  const routeContext = deriveRouteContext(pathname);
  const isGhostMatchup = !!(
    routeContext.pathStreamer &&
    routeContext.pathVodId &&
    routeContext.pathUsername
  );

  useEffect(() => {
    // Only auto-collapse when the ghost matchup path was the *initial* path
    // at mount time — meaning the user arrived via an external/shared link.
    const landedOnGhostMatchup =
      pathname === initialPathnameRef.current && isGhostMatchup;
    if (!landedOnGhostMatchup) return;

    // Collapse after a frame so the panel group has finished mounting
    requestAnimationFrame(() => {
      if (searchPanelRef.current && !searchPanelRef.current.isCollapsed()) {
        searchPanelRef.current.collapse();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs only on mount
  }, []);

  // ---- Register panel controls into the root-level context ----
  const panelControls = useMemo(
    () => ({
      expandSearch: () =>
        animateTransition(() => searchPanelRef.current?.expand()),
      expandEmbed: () =>
        animateTransition(() => embedPanelRef.current?.expand()),
      isSearchCollapsed: () => searchPanelRef.current?.isCollapsed() ?? false,
      isEmbedCollapsed: () => embedPanelRef.current?.isCollapsed() ?? false,
    }),
    [animateTransition]
  );
  useRegisterPanelControls(panelControls);

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
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
