---
id: V3-003
title: Define trust and delegation profile
version: v3
state: done
priority: high
depends_on: [V3-001, V3-008]
area: protocol-design
acceptance:
  - Profile defines principals, participants, human-agent pairs, roles, authority grants, delegation, and audit events.
  - Participant frontmatter extensions distinguish human and agent actions.
  - Secrets and raw tokens are explicitly forbidden in manifests, logs, evidence, and audit events.
evidence:
  - "Added v3 trust schemas for participant kind, roles, authority, delegation scope, principals, and authority grants."
  - "Added `valid/v3-trust-only` fixture proving trust can be claimed independently."
  - "Added `invalid/v3-secret-leak` fixture and validator rule `HA2HA_V3_SECRET_LEAK` proving raw token-like values are rejected from portable records."
  - "`pnpm --filter @ha2ha/protocol test` passed with trust and secret-rejection coverage."
---

## Intent

Define who acted, what they were allowed to do, and which human authority stands behind agent actions.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) sketches trust primitives and participant extensions.

## Work

- Refine authority and delegation vocabulary.
- Define portable audit event requirements.
- Document what remains product auth or provider implementation.

## Acceptance

- Trust profile is useful without mandating one auth provider.
- Sensitive data handling rules are explicit.

## Test Requirements

- Add valid and invalid fixtures for principals, participants, roles, authority grants, delegation, and audit events.
- Add negative tests proving secrets and raw tokens are rejected from manifests, logs, evidence, and audit events.
- Add conformance tests once trust profile schemas exist.

## Verification

```bash
rg -n "Trust Profile|delegation|authority|audit|secrets" docs/v3
pnpm run check
pnpm run test
```
