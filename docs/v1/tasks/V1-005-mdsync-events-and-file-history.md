---
id: V1-005
title: Implement MDSync event and file-history profiles
version: v1
state: ready
priority: high
depends_on: [V1-001, V1-002, V1-004]
area: server
acceptance:
  - MDSync persists protocol-level `workspace_events`.
  - MDSync persists durable `workspace_file_versions`.
  - Event and history routes satisfy the HA2HA profile docs.
  - Product UI for changelog, diff, restore, and stats remains v2 scope.
evidence: []
---

## Intent

Let MDSync claim HA2HA event/history protocol profiles without building product UI prematurely.

## Current Evidence

- v0 explicitly excludes event and durable file-version tables.
- v1 docs define these as protocol-level capabilities.

## Work

- Add schema and migration for events and file versions.
- Record meaningful workspace changes and file versions.
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
