---
id: V2-002
title: Build file history diff and restore UI
version: v2
state: done
priority: high
depends_on: [V1-005]
area: product-ui
acceptance:
  - Users can inspect file versions for a selected path.
  - Users can compare versions.
  - Restore creates a new version instead of mutating history.
evidence:
  - "2026-07-08: Added File history product UI in apps/web/src/app.tsx that renders v1 file-version metadata from GET /api/workspaces/:workspaceId/files/versions?path=<path>."
  - "2026-07-08: Added historical version preview over GET /api/workspaces/:workspaceId/files/versions/:version?path=<path>."
  - "2026-07-08: Added line diff and restore planning helpers in apps/web/src/workspace-product.ts."
  - "2026-07-08: Restore writes historical content through the existing versioned file PUT route with baseVersion, creating a new current version instead of mutating history."
  - "2026-07-08: Added unit tests for diff output and restore request planning in apps/web/src/workspace-product.test.ts."
  - "2026-07-08: Added Playwright coverage proving restore creates version 3 from version 1 while preserving immutable history in the mocked file-version list."
  - "2026-07-08: Existing server route integration coverage continues to verify file-version listing and historical file reads in apps/server/src/workspaces/routes.test.ts."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run test passed."
  - "2026-07-08: pnpm run test:e2e passed."
  - "2026-07-08: pnpm run build passed."
---

## Intent

Make v1 durable file history useful to humans.

## Current Evidence

- [../product-features.md](../product-features.md) defines file history, diff, and restore as product features.
- [../../v1/tasks/V1-005-mdsync-events-and-file-history.md](../../v1/tasks/V1-005-mdsync-events-and-file-history.md) is done and provides the durable file-version data used by this UI.

## Work

- Add version list, preview, diff, and restore flows.
- Preserve immutable version history.
- Attach restore actions to the existing optimistic update semantics.

## Acceptance

- File history UI works over protocol file-version data.
- Restore behavior is auditable and creates a new current version.

## Test Requirements

- Add integration tests for file-version listing and historical file reads.
- Add unit tests for diff and restore planning if restore logic is extracted from UI code.
- Add Playwright coverage proving restore creates a new current version without mutating immutable history.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
pnpm run build
```
