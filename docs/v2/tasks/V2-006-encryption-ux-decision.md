---
id: V2-006
title: Decide and design encryption UX
version: v2
state: done
priority: medium
depends_on: [V2-005]
area: security
acceptance:
  - Key ownership model is documented before implementation.
  - UX impact on preview, raw routes, search, comments, and indexing is explicit.
  - Implementation tasks are created only after the decision is recorded.
evidence:
  - "2026-07-08: Added docs/v2/encryption-ux-decision.md choosing server-managed encryption as the first implementation path."
  - "2026-07-08: Documented key ownership, UX impact on preview/raw routes/search/comments/indexing/admin/import-export, and server-side threat assumptions."
  - "2026-07-08: Recorded follow-up implementation split for key hierarchy, route round-trip tests, migration/backfill, secret handling, import/export behavior, and future end-to-end workspace discovery."
  - "2026-07-08: Updated docs/v2/security-and-identity.md and docs/v2/README.md to point to the decision."
  - "2026-07-08: No encryption code, key generation, key metadata migration, object re-encryption, or HA2HA protocol change was added."
  - "2026-07-08: rg -n \"Encryption|key ownership|server-managed|end-to-end\" docs/v2 passed."
  - "2026-07-08: pnpm run check passed."
---

## Intent

Avoid adding encryption as a vague toggle without deciding what MDSync can inspect.

## Current Evidence

- [../security-and-identity.md](../security-and-identity.md) documents server-managed and client-side tradeoffs.
- [../encryption-ux-decision.md](../encryption-ux-decision.md) records the
  server-managed encryption decision and follow-up implementation split.
- No encryption implementation exists.

## Work

- Record the chosen key ownership model.
- Document capability impacts and threat model assumptions.
- Split implementation tasks after the decision.

## Acceptance

- Product and security tradeoffs are explicit.
- No encryption code is added before the decision exists.

## Test Requirements

- Record the required implementation test plan in the encryption decision before opening code tasks.
- Do not add encryption code in this task; later implementation tasks must name unit, integration, and e2e tests for the chosen model.

## Verification

```bash
rg -n "Encryption|key ownership|server-managed|end-to-end" docs/v2
pnpm run check
```
