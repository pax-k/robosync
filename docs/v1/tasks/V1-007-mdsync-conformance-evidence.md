---
id: V1-007
title: Publish MDSync conformance evidence
version: v1
state: done
priority: high
depends_on: [V1-004, V1-005, V1-006]
area: conformance
acceptance:
  - MDSync declares exactly which HA2HA profiles it supports.
  - Conformance evidence includes target URL, profile, check results, timestamp, actor-attribution checks, target-coordinate checks, and delete `baseVersion` checks.
  - Known gaps are documented without weakening protocol requirements.
evidence:
  - "Added `docs/v1/evidence/mdsync-local-conformance-2026-07-08.json` with machine-readable local MDSync conformance evidence."
  - "Added `docs/v1/mdsync-conformance.md` declaring MDSync support for `core-workspace`, `workspace-convention`, `http-profile`, `event-profile`, and `file-history-profile`."
  - "`docs/v1/mdsync-conformance.md` records target URL `http://localhost:3000`, timestamp `2026-07-08T18:42:47.286Z`, 17 passing checks, actor-attribution checks, target-coordinate checks, delete `baseVersion` checks, and import/export/snapshot status."
  - "Linked MDSync evidence from `docs/v1/README.md` and `docs/v1/conformance.md`."
  - "`HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance` passed on 2026-07-08 with 17 checks and 0 failures."
  - "After Cloudflare deploy, `docs/v1/evidence/mdsync-deployed-conformance-2026-07-08.json` captured `https://mdsync-server-pax.pax.workers.dev` passing 17/17 checks on 2026-07-08."
  - "`pnpm run check` passed on 2026-07-08."
---

## Intent

Make MDSync's status as the first HA2HA implementation measurable and reviewable.

## Current Evidence

- MDSync is documented as the first implementation.
- No conformance artifact exists.

## Work

- Run conformance checks against local and deployed MDSync when available.
- Save evidence in the repo's chosen evidence location.
- Link evidence from protocol docs and task files.
- Record whether import/export/snapshot preservation is unclaimed, claimed and
  passing, or claimed with gaps.

## Acceptance

- A contributor can see exactly what MDSync supports.
- Failed or skipped checks have explicit owners.

## Verification

```bash
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
pnpm run check
```
