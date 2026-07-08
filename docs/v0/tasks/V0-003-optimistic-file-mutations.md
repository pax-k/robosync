---
id: V0-003
title: Review optimistic file mutations
version: v0
state: done
priority: high
depends_on: []
area: server
acceptance:
  - Existing-file updates require `baseVersion` and an `actor`.
  - Stale updates return `409 version_conflict` with latest file data.
  - Delete requires `baseVersion` and an `actor`, and preserves canonical D1 state.
  - Failed conditional writes clean up newly uploaded R2 objects best-effort.
evidence:
  - "2026-07-08: scripts/smoke-backend.sh passed locally and exercised stale update conflict with 409 version_conflict."
  - "2026-07-08: scripts/update-file.mjs updated local workspace kL8JfjajAB_l README.md from version 1 to version 2 using --base-version 1."
  - "2026-07-08: BASE_URL=https://mdsync-server-pax.pax.workers.dev scripts/smoke-backend.sh passed for workspace QVfVtkfHvHF5."
---

## Intent

Confirm that v0 file mutation semantics prevent silent overwrite between agents.

## Current Evidence

- `apps/server/src/workspaces/routes.ts` handles `PUT` and `DELETE` for workspace files.
- Conditional D1 updates and stale-write conflict responses are implemented.
- `scripts/smoke-backend.sh` forces one stale update conflict.
- `scripts/update-file.mjs` uses explicit `--base-version` and `--actor` for agent writes.

## Work

- Review update, create-new-file, stale update, delete, and stale delete paths.
- Confirm `version_conflict` payloads are mergeable by clients.
- Add or attach evidence for the conflict path.

## Acceptance

- Optimistic concurrency behavior matches [../data-model.md](../data-model.md).
- No mutation path silently overwrites an existing file without a matching version.
- Conflict evidence is attached before this task moves to done.

## Completion Evidence

- Local smoke confirmed stale update returns `409 version_conflict`.
- Local script smoke updated `README.md` from version 1 to version 2 using `--base-version 1`.
- Deployed smoke passed the same backend conflict flow.
- Current alignment requires future script and API mutation evidence to include actor attribution.

## Verification

```bash
scripts/smoke-backend.sh
pnpm run check-types
```
