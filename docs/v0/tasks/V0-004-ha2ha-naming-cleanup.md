---
id: V0-004
title: Replace protocol-facing Robosync names with HA2HA names
version: v0
state: done
priority: high
depends_on: [V0-001, V0-003]
area: protocol
acceptance:
  - Raw listing header uses `# ha2ha workspace`.
  - Raw file responses use `X-HA2HA-File-Version` and `X-HA2HA-Path`.
  - Smoke checks assert HA2HA headers instead of Robosync headers.
  - Product UI copy no longer exposes Robosync as the protocol/product name.
evidence:
  - "2026-07-08: Raw listing output starts with # ha2ha workspace and smoke asserts that header."
  - "2026-07-08: Raw file responses emit X-HA2HA-File-Version and X-HA2HA-Path; smoke asserts both."
  - "2026-07-08: Web UI title, default content, visible copy, and favicon title use MDSync."
  - "2026-07-08: Remaining Robosync mentions are historical task text only."
---

## Intent

Complete the pre-public naming cleanup so v0 does not ship old protocol names.

## Current Evidence

- `apps/server/src/workspaces/domain.ts` formats `# ha2ha workspace`.
- `apps/server/src/workspaces/routes.ts` emits `X-HA2HA-File-Version` and `X-HA2HA-Path`.
- `scripts/smoke-backend.sh` checks HA2HA raw listing and raw file headers.
- `apps/web/src/app.tsx`, `apps/web/index.html`, and `apps/web/public/favicon.svg` use MDSync display strings.

## Work

- Replace protocol-facing raw listing and header names with HA2HA names.
- Update smoke checks and docs evidence expectations.
- Update visible web copy to MDSync/HA2HA.

## Acceptance

- `rg -n "X-Robosync|# robosync workspace|Robosync" apps scripts docs/v0` returns only historical task evidence or no runtime-facing hits.
- Backend smoke still passes after the rename.

## Completion Evidence

- Local smoke passed HA2HA raw listing and raw file header checks.
- Deployed smoke passed HA2HA raw listing and raw file header checks.
- Static search returns only historical task text in this file.

## Verification

```bash
rg -n "X-Robosync|# robosync workspace|Robosync" apps scripts docs/v0
scripts/smoke-backend.sh
```
