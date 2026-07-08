---
id: V2-007
title: Add import export retention and storage evolution
version: v2
state: done
priority: medium
depends_on: [V2-003, V2-004, V2-005, V2-006]
area: storage
acceptance:
  - Import/export preserves paths, manifests, events, file history, comments, and evidence where available.
  - Retention policy covers workspaces, file versions, events, comments, admin logs, and orphaned objects.
  - Per-workspace D1 is pursued only with isolation or scale evidence.
evidence:
  - Added write-capability-gated `GET /api/workspaces/:workspaceId/export`
    and `POST /api/workspaces/import` product routes that preserve current
    files, canonical protocol paths, evidence files, HA2HA events, file-version
    contents, comments, and admin events while creating fresh workspace
    capability material on import.
  - Added `GET /api/workspaces/:workspaceId/retention` and
    `POST /api/workspaces/:workspaceId/retention/prune` for manual retention
    policy visibility and operator cleanup of expired events, resolved comments,
    admin logs, old non-current non-comment-anchored file versions, and
    explicit scoped orphan R2 object keys.
  - Added admin UI controls for export JSON, import JSON, imported-workspace
    links, and retention-policy visibility without rendering token strings as
    visible text.
  - Added route coverage in `apps/server/src/workspaces/routes.test.ts` for
    export/import round trips across `.ha2ha/workspace.json`, task files,
    evidence files, file history, comments, protocol events, admin conflicts,
    retention pruning, and scoped orphan cleanup.
  - Added Playwright coverage in `tests/e2e/web-workspace.spec.ts` for admin
    export, import, and retention-policy controls.
  - Documented the storage decision in `docs/v2/storage-evolution.md`:
    app D1 plus R2 remains the V2 topology because no isolation or scale
    evidence justifies per-workspace D1 yet.
  - Verification passed: `pnpm run fix`, `pnpm --filter server run test`,
    `pnpm --filter web run check-types`, `pnpm run check`,
    `pnpm run check-types`, `pnpm run test`, `pnpm run test:e2e`,
    `pnpm run build`.
---

## Intent

Make MDSync durable and operable without prematurely increasing storage complexity.

## Current Evidence

- [../storage-evolution.md](../storage-evolution.md) defines the per-workspace D1 option.
- v0 starts with one app D1 and one R2 bucket.

## Work

- Add import/export flows after protocol data is stable.
- Add retention policy and cleanup jobs.
- Evaluate per-workspace D1 with evidence before implementation.

## Acceptance

- Product data can be exported and retained predictably.
- Storage evolution is justified by evidence, not architectural preference.

## Test Requirements

- Add round-trip import/export fixture tests for canonical protocol paths, manifests, file contents, events, file history, comments, and evidence where available.
- Add retention and cleanup integration tests for expired records and orphaned objects.
- Add migration or storage tests before pursuing per-workspace D1.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run build
```
