---
id: V2-005
title: Add token rotation identity and sessions
version: v2
state: ready
priority: high
depends_on: [V2-004]
area: security
acceptance:
  - Token rotation and revocation UX exists for read and edit capabilities.
  - User/session UX is added only for product needs capability links cannot satisfy.
  - Raw tokens are never stored in plaintext or leaked in logs/evidence.
evidence: []
---

## Intent

Mature access control while preserving v0 capability-link simplicity where it still works.

## Current Evidence

- v0 stores token hashes.
- [../security-and-identity.md](../security-and-identity.md) defines product identity and token maturity.

## Work

- Add token rotation and revocation flows.
- Add identity/session surfaces when needed for ownership, comments, admin, or billing.
- Audit logs and evidence for sensitive actions must not expose secrets.

## Acceptance

- Users can rotate and revoke capabilities safely.
- Identity is product scope unless a future protocol version standardizes it.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
