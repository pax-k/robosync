---
id: V2-003
title: Add comments UI and product data
version: v2
state: ready
priority: medium
depends_on: [V2-002]
area: product
acceptance:
  - Comments are anchored to workspace, path, version, and optional selector.
  - Comments are documented as MDSync product data, not HA2HA v1 protocol.
  - Comment UI handles changed files without silently moving anchors.
evidence: []
---

## Intent

Add asynchronous human discussion without turning comments into v1 protocol scope.

## Current Evidence

- [../product-data-model.md](../product-data-model.md) defines a comments table shape.
- v3 may later revisit comments as protocol review data.

## Work

- Add product data model and routes for comments.
- Add UI for listing, creating, resolving, and anchoring comments.
- Preserve version-aware anchoring.

## Acceptance

- Comments survive file changes without ambiguous anchors.
- HA2HA conformance does not depend on comments.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
