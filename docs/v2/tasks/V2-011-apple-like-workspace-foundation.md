---
id: V2-011
title: Ship the work-first workspace foundation
version: v2
state: done
priority: high
depends_on: [V2-001, V2-002, V2-003, V2-004, V2-005, V2-010]
area: product-ux
acceptance:
  - Guided creation compiles MDSync presets into the existing workspace create contract.
  - Stable routed Overview, Work, Files, Activity, and Settings surfaces preserve read and edit capability queries.
  - A read-safe overview endpoint summarizes tasks, comments, files, and recent activity without leaking administrative state.
  - Preview-first editing persists token-free local drafts and provides explicit recovery for stale drafts and version conflicts.
  - The responsive workspace shell meets WCAG 2.2 AA browser checks and has visual baselines for primary desktop and mobile states.
  - V4-003 reuses stable routes, capabilities, and workspace behavior without freezing this exact visual presentation.
evidence:
  - "2026-07-14: Added strict overview contracts, read-authorized server aggregation, and `@mdsync/client` support with malformed-task isolation and deterministic attention ordering."
  - "2026-07-14: Added React Router workspace routes, guided presets, work-first Overview, grouped files, contextual inspectors, responsive navigation, and the Quiet MDSync token system."
  - "2026-07-14: Added IndexedDB draft persistence, stale-draft recovery, explicit conflict resolution, confirmation gates, and immediate read-only transition after edit-capability revocation."
  - "2026-07-14: Added helper, contract, route, client, Axe, responsive Playwright, and visual-regression coverage for the workspace foundation."
  - "2026-07-14: Green release proof: contracts 6/6, server 14/14, client 3/3, web 13/13, full Playwright 11/11, package smoke, `pnpm run check`, `pnpm run check-types`, and `pnpm run build`."
  - "2026-07-14: Local proof passed on isolated Alchemy stage `local`: Web `http://localhost:5173`, Server `http://localhost:3200`, workspace create, and Overview read all returned 200."
  - "2026-07-14: Deployed the full Alchemy stage `pax` stack to Cloudflare and live-smoked Web, HA2HA, Server, workspace create, routed workspace read, and Overview aggregation with 200 responses."
---

# V2-011 Work-First Workspace Foundation

## Intent

Make MDSync a calm control room for mixed human and technical teams. Markdown
remains the durable substrate, while the product leads with current state,
attention, active work, review, and the next useful action.

## Product Boundary

This is an MDSync v2 product experience. It consumes HA2HA task metadata and
protocol events without redefining portable HA2HA semantics. The templates are
MDSync presets, not conformance claims, and the additive overview response never
exposes capability values or edit-only operational state.

## Shipped Surface

- `/` and `/new`: guided creation using Blank, Project delivery, or
  Review/investigation presets.
- `/w/:id`: work-first Overview and deterministic Focus action.
- `/w/:id/work`: tasks and evidence grouped by work state.
- `/w/:id/files/*`: addressable preview/editor with comments and history query
  panels.
- `/w/:id/activity`: human-readable events with raw protocol details available
  on demand.
- `/w/:id/settings`: edit-only sharing, portability, retention, health, and
  diagnostics.
- `GET /api/workspaces/:workspaceId/overview`: read-authorized aggregate view
  for files, task state, comments, and recent activity.

## Durable Editing Rules

- Preview remains the default, including edit-capable links.
- Unsaved content stays out of URLs and capability tokens stay out of
  IndexedDB.
- Drafts save after 500 ms, expire after seven days, restore directly only when
  their base version still matches, and otherwise enter recovery comparison.
- A stale save retains both local and remote content until the user explicitly
  chooses a conflict path.

## Verification

```bash
pnpm dlx ultracite fix
pnpm --filter @mdsync/contracts test
pnpm --filter server test
pnpm --filter @mdsync/client test
node scripts/mdsync-client-package-smoke.mjs
pnpm --filter @mdsync/ui check-types
pnpm --filter web test
pnpm run test:e2e
pnpm run check
pnpm run check-types
pnpm run build
```
