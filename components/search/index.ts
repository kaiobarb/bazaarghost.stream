/**
 * @module components/search
 *
 * Search panel module — the main interactive search UI for bazaarghost.
 *
 * Re-exports the default {@link SearchPanel} orchestrator component (consumed
 * by the app layout), the {@link SearchMode} type, and the
 * {@link usePanelControls} hook for imperative panel expand/collapse.
 */
export { default } from "./search-panel";
export type { SearchMode } from "./types";
export { usePanelControls, PanelControlsProvider } from "./panel-context";
