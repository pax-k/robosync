---
id: V2-006
title: Decide and design encryption UX
version: v2
state: ready
priority: medium
depends_on: [V2-005]
area: security
acceptance:
  - Key ownership model is documented before implementation.
  - UX impact on preview, raw routes, search, comments, and indexing is explicit.
  - Implementation tasks are created only after the decision is recorded.
evidence: []
---

## Intent

Avoid adding encryption as a vague toggle without deciding what MDSync can inspect.

## Current Evidence

- [../security-and-identity.md](../security-and-identity.md) documents server-managed and client-side tradeoffs.
- No encryption implementation exists.

## Work

- Record the chosen key ownership model.
- Document capability impacts and threat model assumptions.
- Split implementation tasks after the decision.

## Acceptance

- Product and security tradeoffs are explicit.
- No encryption code is added before the decision exists.

## Verification

```bash
rg -n "Encryption|key ownership|server-managed|end-to-end" docs/v2
```
