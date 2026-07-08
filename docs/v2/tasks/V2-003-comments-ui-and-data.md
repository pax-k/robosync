---
id: V2-003
title: Add comments UI and product data
version: v2
state: done
priority: medium
depends_on: [V2-002]
area: product
acceptance:
  - Comments are anchored to workspace, path, version, and optional selector.
  - Comments are documented as MDSync product data, not HA2HA v1 protocol.
  - Comment UI handles changed files without silently moving anchors.
evidence:
  - "2026-07-08: Added comments product migration packages/db/src/migrations/0002_comments.sql with workspace/path/version anchors, optional anchor_json, body, author_id, and resolution fields."
  - "2026-07-08: Updated packages/db/src/schema/workspaces.ts and schema tests so comments require existing workspace_file_versions anchors and cascade with workspace history."
  - "2026-07-08: Added product routes GET/POST /api/workspaces/:workspaceId/comments and POST /api/workspaces/:workspaceId/comments/:commentId/resolve in apps/server/src/workspaces/routes.ts."
  - "2026-07-08: Added route tests proving comments can be created, listed, resolved, and remain anchored to v1 after the file advances to v2."
  - "2026-07-08: Added Comments UI in apps/web/src/app.tsx for listing, creating, resolving, and inspecting version-anchored comments."
  - "2026-07-08: Added Playwright coverage for creating, listing, resolving, and inspecting a comment after the file changes."
  - "2026-07-08: Updated docs/v2/product-data-model.md to document comments as MDSync product data, not HA2HA protocol data."
  - "2026-07-08: pnpm --filter @mdsync/db test passed."
  - "2026-07-08: pnpm --filter server test passed."
  - "2026-07-08: pnpm --filter web test passed."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run test passed."
  - "2026-07-08: pnpm run test:e2e passed."
  - "2026-07-08: pnpm run build passed."
---

## Intent

Add asynchronous human discussion without turning comments into v1 protocol scope.

## Current Evidence

- [../product-data-model.md](../product-data-model.md) defines a comments table shape.
- [../product-data-model.md](../product-data-model.md) documents resolution fields as product state.
- v3 may later revisit comments as protocol review data.

## Work

- Add product data model and routes for comments.
- Add UI for listing, creating, resolving, and anchoring comments.
- Preserve version-aware anchoring.

## Acceptance

- Comments survive file changes without ambiguous anchors.
- HA2HA conformance does not depend on comments.

## Test Requirements

- Add data and route tests for comments anchored to workspace, path, version, and optional selector.
- Add regression tests proving changed files do not silently move comment anchors.
- Add Playwright coverage for creating, listing, resolving, and inspecting comments.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
pnpm run build
```
