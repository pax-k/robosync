---
id: V0-004
title: Replace protocol-facing Robosync names with HA2HA names
version: v0
state: ready
priority: high
depends_on: [V0-001, V0-003]
area: protocol
acceptance:
  - Raw listing header uses `# ha2ha workspace`.
  - Raw file responses use `X-HA2HA-File-Version` and `X-HA2HA-Path`.
  - Smoke checks assert HA2HA headers instead of Robosync headers.
  - Product UI copy no longer exposes Robosync as the protocol/product name.
evidence: []
---

## Intent

Complete the pre-public naming cleanup so v0 does not ship old protocol names.

## Current Evidence

- `apps/server/src/workspaces/domain.ts` still formats `# robosync workspace`.
- `apps/server/src/workspaces/routes.ts` still emits `X-Robosync-Version` and `X-Robosync-Path`.
- `scripts/smoke-backend.sh` still checks `X-Robosync-*` headers.
- `apps/web/src/app.tsx` and `apps/web/index.html` still contain Robosync display strings.

## Work

- Replace protocol-facing raw listing and header names with HA2HA names.
- Update smoke checks and docs evidence expectations.
- Update visible web copy to MDSync/HA2HA.

## Acceptance

- `rg -n "X-Robosync|# robosync workspace|Robosync" apps scripts docs/v0` returns only historical task evidence or no runtime-facing hits.
- Backend smoke still passes after the rename.

## Verification

```bash
rg -n "X-Robosync|# robosync workspace|Robosync" apps scripts docs/v0
scripts/smoke-backend.sh
```
