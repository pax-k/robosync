---
id: V2-004
title: Build stats and admin surfaces
version: v2
state: done
priority: medium
depends_on: [V2-001, V2-002]
area: product-admin
acceptance:
  - Stats show useful workspace activity and health without redefining protocol behavior.
  - Admin surfaces expose cleanup, retention, storage, and workspace health state.
  - Admin actions are permissioned once identity exists or otherwise limited to deployment operators.
evidence:
  - "2026-07-08: Added product admin migration packages/db/src/migrations/0003_workspace_admin_events.sql for workspace-scoped operational events such as file.version_conflict and future cleanup failures."
  - "2026-07-08: Updated packages/db/src/schema/workspaces.ts and schema tests so workspace_admin_events are product data and cascade with workspaces."
  - "2026-07-08: Added GET /api/workspaces/:workspaceId/admin/stats in apps/server/src/workspaces/routes.ts with write-capability authorization until product identity exists."
  - "2026-07-08: Added server-side stats aggregation over workspaces, files, immutable file versions, HA2HA events, comments, task frontmatter state, conflicts, storage, cleanup, retention, and health issues."
  - "2026-07-08: Stale file update/create/delete conflicts now record product-only workspace_admin_events while GET /api/workspaces/:workspaceId/events remains HA2HA protocol-only."
  - "2026-07-08: Added route integration coverage proving admin stats aggregate files, versions, events, task state, comments, conflicts, storage, cleanup, retention, and health while read-token access is rejected."
  - "2026-07-08: Added Admin UI in apps/web/src/app.tsx with health, stats, task state, storage, retention, cleanup, and recent conflict sections visible only from edit-capability workspaces."
  - "2026-07-08: Added Playwright coverage for admin visibility, cleanup/task empty states, conflict health, and admin stats error rendering."
  - "2026-07-08: Updated docs/v2/product-data-model.md and docs/v2/product-features.md to document workspace_admin_events and admin stats as MDSync product scope, not HA2HA protocol scope."
  - "2026-07-08: pnpm --filter @mdsync/db test passed."
  - "2026-07-08: pnpm --filter server test passed."
  - "2026-07-08: pnpm --filter web test passed."
  - "2026-07-08: pnpm run fix && pnpm run check passed."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run test passed."
  - "2026-07-08: pnpm run test:e2e passed."
  - "2026-07-08: pnpm run build passed."
---

## Intent

Give operators and workspace owners visibility into usage, health, and cleanup needs.

## Current Evidence

- [../product-features.md](../product-features.md) defines stats and admin surfaces.
- Admin UI exists in `apps/web/src/app.tsx`.

## Work

- Add stats views for files, versions, recent updates, task state, and conflicts.
- Add admin views for storage, cleanup, retention, and failed jobs.
- Keep admin data product-specific.

## Acceptance

- Operators can inspect workspace health and storage state.
- Product-only stats do not become required protocol data.

## Test Requirements

- Add unit or integration tests for stats aggregation over files, versions, events, task state, and conflicts.
- Add permission tests for admin-only actions once identity exists.
- Add Playwright smoke coverage for admin visibility, empty states, and error states.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
pnpm run build
```
