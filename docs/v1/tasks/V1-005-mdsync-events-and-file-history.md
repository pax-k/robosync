---
id: V1-005
title: Implement MDSync event and file-history profiles
version: v1
state: done
priority: high
depends_on: [V1-001, V1-002, V1-004]
area: server
acceptance:
  - MDSync persists protocol-level `workspace_events`.
  - MDSync persists durable `workspace_file_versions`.
  - Event and file-version records preserve actor and versioned target metadata.
  - Event and history routes satisfy the HA2HA profile docs.
  - Product UI for changelog, diff, restore, and stats remains v2 scope.
evidence:
  - "2026-07-08: Added D1 migration 0001_ha2ha_events_history.sql for workspace_events and workspace_file_versions."
  - "2026-07-08: MDSync now records file.created, file.updated, and file.deleted protocol events with actor, workspaceId, path, version, timestamp, and payload metadata."
  - "2026-07-08: MDSync now persists durable workspace_file_versions for created, updated, and deleted file versions while keeping historical object bodies readable."
  - "2026-07-08: Added event routes GET /api/workspaces/:workspaceId/events and GET /w/:workspaceId/raw/events."
  - "2026-07-08: Added file-history routes GET /api/workspaces/:workspaceId/files/versions?path=<path> and GET /api/workspaces/:workspaceId/files/versions/:version?path=<path>."
  - "2026-07-08: pnpm --filter @mdsync/ha2ha-http test passed with event/history mock coverage."
  - "2026-07-08: pnpm --filter @mdsync/ha2ha-protocol test passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: ROBOSYNC_SERVER_ONLY=1 pnpm --filter @mdsync/infra dev updated the local database and started MDSync at http://localhost:3000."
  - "2026-07-08: HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance passed 17/17 checks for local workspace ZPTqojy65YpK, including events.read, events.raw-read, file-history.list, and file-history.read."
---

## Intent

Let MDSync claim HA2HA event/history protocol profiles without building product UI prematurely.

## Current Evidence

- v0 explicitly excludes event and durable file-version tables.
- v1 docs define these as protocol-level capabilities.

## Work

- Add schema and migration for events and file versions.
- Record meaningful workspace changes and file versions.
- Store enough metadata to reconstruct actor, `workspaceId`, `path`, and
  `version` for each protocol event or file-version record.
- Expose protocol read routes for event/history data.
- Add conformance coverage.

## Acceptance

- MDSync can pass the event/history profile checks.
- v2 product UI remains a separate layer over the protocol data.

## Verification

```bash
pnpm run check-types
pnpm run check
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
```
