---
id: V2-001
title: Build changelog and activity UI
version: v2
state: done
priority: high
depends_on: [V1-005]
area: product-ui
acceptance:
  - Workspace activity UI renders v1 protocol events.
  - Activity filtering and grouping are product-only behavior.
  - UI does not require product-private events for HA2HA conformance.
evidence:
  - "2026-07-08: Added Workspace activity product UI in apps/web/src/app.tsx that renders v1 protocol events from GET /api/workspaces/:workspaceId/events."
  - "2026-07-08: Added product-only activity filtering by path, actor, event type, and time plus date grouping in apps/web/src/workspace-product.ts."
  - "2026-07-08: Added regression coverage proving activity filtering returns the original protocol event objects without mutating their shape."
  - "2026-07-08: Added Playwright coverage for path, actor, type, and time filters in tests/e2e/web-workspace.spec.ts."
  - "2026-07-08: Existing server route integration coverage continues to verify event listing over v1 event data in apps/server/src/workspaces/routes.test.ts."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run test passed."
  - "2026-07-08: pnpm run test:e2e passed."
  - "2026-07-08: pnpm run build passed."
---

## Intent

Turn protocol events into a useful human-facing changelog.

## Current Evidence

- [../product-roadmap.md](../product-roadmap.md) lists changelog/activity UI first.
- [../../v1/tasks/V1-005-mdsync-events-and-file-history.md](../../v1/tasks/V1-005-mdsync-events-and-file-history.md) is done and provides the v1 event data used by this UI.

## Work

- Add activity views after v1 event data exists.
- Provide filters for file, actor, type, and time where useful.
- Link activity entries back to files, tasks, or evidence.

## Acceptance

- Users can inspect recent workspace changes.
- Event presentation remains separate from the protocol record shape.

## Test Requirements

- Add integration tests for event listing, filtering, and grouping over v1 event data.
- Add Playwright coverage for activity UI file, actor, type, and time filters.
- Add regression coverage proving product-only activity presentation does not mutate the HA2HA event record shape.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
pnpm run build
```
