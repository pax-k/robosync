---
id: V3-010
title: Define governance audit and proof of work profile
area: protocol-governance
status: planned
acceptance:
  - Governance direction distinguishes current v1 evidence substrate from future v3 audit-grade claims.
  - Profile defines proof-of-work records, audit events, authority grants, policy gates, risk exceptions, and audit exports.
  - Blind spots cover tamper evidence, identity and authority, evidence quality, runtime enforcement, and chain-of-thought boundaries.
  - Conformance expectations identify required validation, blocking behavior, secret rejection, append-oriented audit events, and export preservation.
  - Product boundaries distinguish MDSync governance UX from portable HA2HA governance records.
evidence: []
---

# V3-010 Governance Audit And Proof Of Work

## Goal

Define how HA2HA and MDSync should support agent governance, audit trails,
evidence quality, and proof-of-work without over-claiming current v1
capabilities.

## Context

- [../governance-audit-proof-of-work.md](../governance-audit-proof-of-work.md)
  captures the target governance profile direction.
- [../collaboration-protocol.md](../collaboration-protocol.md) defines trust,
  evidence/review, coordination, and engineering profile direction.
- [../agent-harness-integration-playbooks.md](../agent-harness-integration-playbooks.md)
  defines how heterogeneous agents project work into HA2HA records.

## Work

- Decide whether governance/audit/proof-of-work is a standalone v3 profile or a
  product bundle over existing v3 profiles.
- Define portable proof-of-work record schemas.
- Define append-oriented audit event schemas.
- Define authority grant and policy gate semantics.
- Define evidence quality states: accepted, rejected, stale, insufficient, and
  risk-accepted.
- Define audit export contents and preservation requirements.
- Add invalid fixtures for missing authority, missing evidence, unresolved
  review, stale checks, raw-token leakage, and mutable audit events.

## Out Of Scope

- Claiming legal compliance.
- Requiring one identity provider.
- Requiring raw chain-of-thought storage.
- Replacing SIEM, EDR, IAM, GRC, CI, Git, deployment, or incident tooling.

## Verification

```bash
rg -n "governance|audit|proof|authority|approval|evidence" docs/v3
pnpm run check
pnpm run test
```
