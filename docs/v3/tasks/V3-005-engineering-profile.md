---
id: V3-005
title: Define engineering profile
version: v3
state: ready
priority: medium
depends_on: [V3-001, V3-002, V3-004]
area: protocol-design
acceptance:
  - Profile defines portable repository, branch, commit, issue, pull request, check, deployment, and code review references.
  - Provider-specific models stay behind implementation adapters.
  - Required checks can block task completion when the profile is claimed.
evidence: []
---

## Intent

Make software work first-class without turning HA2HA into a Git provider API.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) sketches engineering primitives and task extensions.

## Work

- Define portable engineering vocabulary and manifest extensions.
- Define task-level engineering references.
- Define check evidence and freshness expectations.

## Acceptance

- Engineering profile is optional and independently conformable.
- Provider adapters remain implementation concerns.

## Verification

```bash
rg -n "Engineering Profile|repository|pull request|check|deployment" docs/v3
```
