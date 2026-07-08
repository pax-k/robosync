---
id: V0-003
title: Review optimistic file mutations
version: v0
state: review
priority: high
depends_on: []
area: server
acceptance:
  - Existing-file updates require `baseVersion`.
  - Stale updates return `409 version_conflict` with latest file data.
  - Delete honors optional `baseVersion` and preserves canonical D1 state.
  - Failed conditional writes clean up newly uploaded R2 objects best-effort.
evidence: []
---

## Intent

Confirm that v0 file mutation semantics prevent silent overwrite between agents.

## Current Evidence

- `apps/server/src/workspaces/routes.ts` handles `PUT` and `DELETE` for workspace files.
- Conditional D1 updates and stale-write conflict responses are implemented.
- `scripts/smoke-backend.sh` forces one stale update conflict.

## Work

- Review update, create-new-file, stale update, delete, and stale delete paths.
- Confirm `version_conflict` payloads are mergeable by clients.
- Add or attach evidence for the conflict path.

## Acceptance

- Optimistic concurrency behavior matches [../data-model.md](../data-model.md).
- No mutation path silently overwrites an existing file without a matching version.
- Conflict evidence is attached before this task moves to done.

## Verification

```bash
scripts/smoke-backend.sh
pnpm run check-types
```
