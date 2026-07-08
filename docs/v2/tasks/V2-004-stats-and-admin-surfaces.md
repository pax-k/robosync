---
id: V2-004
title: Build stats and admin surfaces
version: v2
state: ready
priority: medium
depends_on: [V2-001, V2-002]
area: product-admin
acceptance:
  - Stats show useful workspace activity and health without redefining protocol behavior.
  - Admin surfaces expose cleanup, retention, storage, and workspace health state.
  - Admin actions are permissioned once identity exists or otherwise limited to deployment operators.
evidence: []
---

## Intent

Give operators and workspace owners visibility into usage, health, and cleanup needs.

## Current Evidence

- [../product-features.md](../product-features.md) defines stats and admin surfaces.
- No admin UI exists yet.

## Work

- Add stats views for files, versions, recent updates, task state, and conflicts.
- Add admin views for storage, cleanup, retention, and failed jobs.
- Keep admin data product-specific.

## Acceptance

- Operators can inspect workspace health and storage state.
- Product-only stats do not become required protocol data.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
