---
id: V0-001
title: Review backend workspace substrate
version: v0
state: review
priority: high
depends_on: []
area: server
acceptance:
  - Workspace create, metadata, tree, JSON file, raw listing, and raw file routes match the v0 API contract.
  - D1 remains the canonical workspace/file index and R2 remains the file-byte store.
  - Evidence is attached from local smoke or focused route tests before this task moves to done.
evidence: []
---

## Intent

Confirm that the implemented backend substrate is ready for v0 and matches the docs.

## Current Evidence

- `apps/server/src/workspaces/routes.ts` defines workspace create/read/tree/file/raw routes.
- `apps/server/src/workspaces/storage.ts` reads and writes D1/R2-backed workspace data.
- `packages/db/src/schema/workspaces.ts` defines `workspaces` and `workspace_files`.
- `scripts/smoke-backend.sh` exercises the core backend flow.

## Work

- Compare implemented routes against [../api-contract.md](../api-contract.md).
- Confirm responses do not leak raw capability tokens.
- Confirm raw listing and file reads are deterministic.
- Attach smoke or test output as evidence.

## Acceptance

- All documented v0 backend routes work locally.
- Route behavior and docs agree.
- Any discovered mismatch has a follow-up task or is fixed before completion.

## Verification

```bash
scripts/smoke-backend.sh
pnpm run check-types
```
