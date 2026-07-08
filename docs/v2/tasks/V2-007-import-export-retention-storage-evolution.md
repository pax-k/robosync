---
id: V2-007
title: Add import export retention and storage evolution
version: v2
state: ready
priority: medium
depends_on: [V2-003, V2-004, V2-005, V2-006]
area: storage
acceptance:
  - Import/export preserves paths, manifests, events, file history, comments, and evidence where available.
  - Retention policy covers workspaces, file versions, events, comments, admin logs, and orphaned objects.
  - Per-workspace D1 is pursued only with isolation or scale evidence.
evidence: []
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
