---
id: V2-001
title: Build changelog and activity UI
version: v2
state: ready
priority: high
depends_on: [V1-005]
area: product-ui
acceptance:
  - Workspace activity UI renders v1 protocol events.
  - Activity filtering and grouping are product-only behavior.
  - UI does not require product-private events for HA2HA conformance.
evidence: []
---

## Intent

Turn protocol events into a useful human-facing changelog.

## Current Evidence

- [../product-roadmap.md](../product-roadmap.md) lists changelog/activity UI first.
- v1 event persistence is not implemented yet.

## Work

- Add activity views after v1 event data exists.
- Provide filters for file, actor, type, and time where useful.
- Link activity entries back to files, tasks, or evidence.

## Acceptance

- Users can inspect recent workspace changes.
- Event presentation remains separate from the protocol record shape.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
