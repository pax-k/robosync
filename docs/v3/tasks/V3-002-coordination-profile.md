---
id: V3-002
title: Define coordination profile
version: v3
state: ready
priority: high
depends_on: [V3-001]
area: protocol-design
acceptance:
  - Profile defines work items, dependencies, claims, leases, handoffs, blockers, acceptance criteria, questions, and approvals.
  - Task frontmatter extensions are schema-ready.
  - Claim and handoff semantics preserve v1 file conflict behavior.
evidence: []
---

## Intent

Make delegation, claiming, handoff, review, and completion portable across HA2HA implementations.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) sketches coordination primitives and task frontmatter extensions.

## Work

- Refine profile vocabulary and state transitions.
- Define Markdown conventions and machine-readable fields.
- Add valid and invalid examples after decisions are accepted.

## Acceptance

- Coordination can be claimed independently from trust, review, or engineering profiles.
- A simple v1 workspace does not need this profile.

## Test Requirements

- Add valid and invalid fixtures for claims, leases, handoffs, blockers, dependencies, acceptance criteria, questions, and approvals.
- Add validator or conformance tests once coordination schemas exist.
- Add regression coverage proving coordination claims preserve v1 file conflict behavior.

## Verification

```bash
rg -n "Coordination Profile|claim|handoff|acceptance|approval" docs/v3
pnpm run check
pnpm run test
```
