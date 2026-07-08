---
id: V3-003
title: Define trust and delegation profile
version: v3
state: ready
priority: high
depends_on: [V3-001]
area: protocol-design
acceptance:
  - Profile defines principals, participants, human-agent pairs, roles, authority grants, delegation, and audit events.
  - Participant frontmatter extensions distinguish human and agent actions.
  - Secrets and raw tokens are explicitly forbidden in manifests, logs, evidence, and audit events.
evidence: []
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

## Verification

```bash
rg -n "Trust Profile|delegation|authority|audit|secrets" docs/v3
```
