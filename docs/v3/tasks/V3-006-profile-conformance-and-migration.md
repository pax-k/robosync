---
id: V3-006
title: Define profile conformance and migration
version: v3
state: ready
priority: medium
depends_on: [V3-002, V3-003, V3-004, V3-005]
area: conformance
acceptance:
  - Each v3 profile has conformance levels, valid fixtures, invalid fixtures, and compatibility notes.
  - Migration notes explain relationship to v1 core and v2 product features.
  - Implementations can claim profiles independently.
evidence: []
---

## Intent

Keep v3 extensible without making every implementation adopt every collaboration feature.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) lists draft v3 conformance levels and enforcement needs.

## Work

- Define profile-specific conformance requirements.
- Add migration notes from v1 and v2 docs.
- Document what product features remain outside protocol conformance.

## Acceptance

- v3 profile adoption remains partial and explicit.
- Conformance expectations are clear enough for future validators.

## Test Requirements

- Add conformance tests for independently claimed profiles.
- Add valid and invalid fixtures for each profile claim level.
- Add migration fixture tests from v1/v2 data into claimed v3 profile records.

## Verification

```bash
rg -n "Conformance Levels|migration|profile" docs/v3
pnpm run check
pnpm run test
```
