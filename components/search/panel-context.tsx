"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * Imperative panel controls exposed by {@link DesktopLayout} so that
 * sibling components (e.g. {@link GlobalSearchHeader}, {@link GhostResultRow})
 * can expand/collapse the resizable panels without prop-drilling.
 */
export interface PanelControls {
  /** Expand the search results panel (left). */
  expandSearch: () => void;
  /** Expand the embed/player panel (right). */
  expandEmbed: () => void;
  /** Whether the search results panel is currently collapsed. */
  isSearchCollapsed: () => boolean;
  /** Whether the embed/player panel is currently collapsed. */
  isEmbedCollapsed: () => boolean;
}

/**
 * Internal context value: a mutable ref that {@link DesktopLayout} writes
 * its panel control callbacks into.  The ref indirection lets the provider
 * live in the root layout while the actual panel refs live deeper in the
 * `(embed)` layout subtree.
 */
interface PanelContextValue {
  /** Mutable slot — DesktopLayout writes its controls here on mount. */
  controlsRef: React.MutableRefObject<PanelControls | null>;
}

const PanelCtx = createContext<PanelContextValue | null>(null);

// ---- Provider (rendered once in root layout) ----

/**
 * Wrap the component tree so that any descendant can call
 * {@link usePanelControls}.  The actual panel callbacks are registered
 * later by {@link DesktopLayout} via {@link useRegisterPanelControls}.
 */
export function PanelControlsProvider({ children }: { children: ReactNode }) {
  const controlsRef = useRef<PanelControls | null>(null);
  const value = useMemo(() => ({ controlsRef }), []);
  return <PanelCtx value={value}>{children}</PanelCtx>;
}

// ---- Registration hook (called by DesktopLayout) ----

/**
 * Register panel control callbacks into the shared context ref.
 * Call this from {@link DesktopLayout} on mount; the returned cleanup
 * function clears the ref on unmount.
 */
export function useRegisterPanelControls(controls: PanelControls): void {
  const ctx = useContext(PanelCtx);
  // Write on every render so the ref always points to the latest callbacks
  if (ctx) ctx.controlsRef.current = controls;
}

// ---- Consumer hook ----

/** Noop defaults — safe to call when no panels are mounted (e.g. mobile). */
const NOOP: PanelControls = {
  expandSearch: () => {},
  expandEmbed: () => {},
  isSearchCollapsed: () => false,
  isEmbedCollapsed: () => false,
};

/**
 * Consume the panel controls.
 *
 * Returns noop defaults when no panels are registered (mobile layout or
 * before DesktopLayout mounts) so callers never need a null-check.
 *
 * Because the underlying storage is a ref, callers that need reactivity
 * should call the returned functions inside event handlers or effects,
 * not during render.
 */
export function usePanelControls(): PanelControls {
  const ctx = useContext(PanelCtx);

  return useMemo<PanelControls>(
    () => ({
      expandSearch: () => ctx?.controlsRef.current?.expandSearch(),
      expandEmbed: () => ctx?.controlsRef.current?.expandEmbed(),
      isSearchCollapsed: () =>
        ctx?.controlsRef.current?.isSearchCollapsed() ?? false,
      isEmbedCollapsed: () =>
        ctx?.controlsRef.current?.isEmbedCollapsed() ?? false,
    }),
    [ctx]
  );
}
