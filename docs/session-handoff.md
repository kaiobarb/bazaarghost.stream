# Session Handoff

Last updated: 2026-03-07
Branch: `vod-refactor`

## Why this file exists

This is a continuity note so work can resume on another machine without needing the full original chat context.

## Product direction agreed in this session

- The embed should be mostly always visible and URL-driven.
- Route model centers on streamer-scoped paths and ghost deep links.
- Search results remain present in a persistent side panel; query params control result state.

## Routing contract created

- Canonical draft written to: `.ignore/routing-contract.md`.
- Scope of that contract intentionally focused on:
  - `/search`
  - `/streamer/[streamer_login]`
  - `/streamer/[streamer_login]/[vodId]`
  - `/streamer/[streamer_login]/vs/[ghost_name]/[vodId]`
  - optional `...[occurrence]`
- `/vods/*` and `/streamers/*` were intentionally deferred in that draft.

## Layout/refactor direction agreed

- Use shadcn sidebar architecture as the base pattern.
- Search/filter/mode/result UI lives in sidebar.
- Embed lives in the main inset content area.
- Keep spacious padding and the existing roomy feel.

## Mobile drawer behavior requested

Final requested behavior:

- Drawer should come from bottom (mobile).
- Peek state should cover ~25% of viewport.
- Open state should cover ~90% of viewport.
- "Search & filters" trigger should toggle the mobile drawer.

## Notes on diagnostics observed

- Hydration warning seen in dev included `cz-shortcut-listen` on `<body>`.
- That is typically extension-injected DOM noise and not usually core app logic.
- Accessibility warning about `aria-hidden` + focused descendant was also observed while iterating on mobile overlay behavior.

## Files touched during this work stream

- `components/search-panel.tsx`
- `components/ui/sidebar.tsx`
- `components/ui/drawer.tsx`
- `hooks/use-mobile.ts`
- `.ignore/routing-contract.md`

## Current state check

- `git status` at handoff time: clean working tree on `vod-refactor`.

## Suggested next steps when resuming

1. Verify current runtime behavior on real mobile viewport (not just desktop emulation):
   - drawer visible in peek state
   - drawer opens to 90%
   - trigger toggles open/close
2. Re-validate desktop sidebar collapse/expand interactions.
3. If drawer still misbehaves, isolate by temporarily rendering a minimal drawer-only test route.
4. Continue refactor by splitting search panel into smaller components (sidebar chrome, results list, route-state hook).

## Context for a new assistant session

If starting a new chat on another machine, paste this summary:

"Continue from `docs/session-handoff.md` and `.ignore/routing-contract.md`. We are mid-refactor toward a shadcn inset-sidebar layout with embed in main area and search in sidebar. Mobile should use a bottom drawer with 25% peek and 90% open. Keep URL-driven embed/search behavior aligned with routing contract."
