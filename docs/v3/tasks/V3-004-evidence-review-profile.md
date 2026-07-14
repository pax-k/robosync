---
id: V3-004
title: Define evidence and review profile
version: v3
state: done
priority: high
depends_on: [V3-001, V3-008, V3-002, V3-003]
area: protocol-design
acceptance:
  - Profile defines evidence records, check results, review comments, questions, responses, and approval records.
  - Review anchors use stable workspace coordinates.
  - Blocking review semantics compose with the coordination profile.
evidence:
  - "Added v3 evidence/review schemas for evidence add requests, review anchors, review comments, questions, responses, and approvals."
  - "Added `valid/v3-evidence-review-only` fixture proving evidence/review can be claimed independently."
  - "Added tests proving review anchors require stable workspace coordinates."
  - "Added completion-gate validation for missing evidence, missing approvals, and unresolved blocking reviews."
  - "`pnpm --filter @ha2ha/protocol test` passed with evidence/review coverage."
---

## Intent

Make proof, feedback, questions, and approvals portable rather than product-private.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) sketches evidence and review primitives.
- v2 comments remain product scope until this profile is defined and accepted.

## Work

- Define evidence record and review anchor shapes.
- Decide how comments move from product-only scope to protocol profile scope, if at all.
- Add examples and invalid fixtures after decisions are accepted.

## Acceptance

- Evidence and review records can be exchanged between implementations.
- Product review UI remains separate from portable record semantics.

## Test Requirements

- Add valid and invalid fixtures for evidence records, check results, review anchors, questions, responses, and approvals.
- Add tests proving review anchors use stable workspace coordinates.
- Add conformance coverage proving blocking review semantics compose with the coordination profile.

## Verification

```bash
rg -n "Evidence And Review Profile|review|question|approval|workspaceId" docs/v3
pnpm run check
pnpm run test
```
