---
id: V2-002
title: Build file history diff and restore UI
version: v2
state: ready
priority: high
depends_on: [V1-005]
area: product-ui
acceptance:
  - Users can inspect file versions for a selected path.
  - Users can compare versions.
  - Restore creates a new version instead of mutating history.
evidence: []
---

## Intent

Make v1 durable file history useful to humans.

## Current Evidence

- [../product-features.md](../product-features.md) defines file history, diff, and restore as product features.
- v1 file-version persistence is not implemented yet.

## Work

- Add version list, preview, diff, and restore flows.
- Preserve immutable version history.
- Attach restore actions to the existing optimistic update semantics.

## Acceptance

- File history UI works over protocol file-version data.
- Restore behavior is auditable and creates a new current version.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
