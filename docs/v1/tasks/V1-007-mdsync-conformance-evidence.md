---
id: V1-007
title: Publish MDSync conformance evidence
version: v1
state: ready
priority: high
depends_on: [V1-004, V1-005, V1-006]
area: conformance
acceptance:
  - MDSync declares exactly which HA2HA profiles it supports.
  - Conformance evidence includes target URL, profile, check results, and timestamp.
  - Known gaps are documented without weakening protocol requirements.
evidence: []
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

## Acceptance

- A contributor can see exactly what MDSync supports.
- Failed or skipped checks have explicit owners.

## Verification

```bash
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
pnpm run check
```
