/**
 * @module components/embed
 *
 * Embed module — Twitch player integration, ghost loader, and related UI.
 *
 * Re-exports the provider, panel, drawer, ghost loader, and key types.
 */
export { EmbedProvider, useEmbed } from "./embed-provider";
export type { EmbedGhost } from "./embed-provider";
export { EmbedPanel } from "./embed-panel";
export { EmbedDrawer } from "./embed-drawer";
export { GhostLoader } from "./ghost-loader";
