---
id: V3-010
title: Define governance audit and proof of work profile
version: v3
state: done
priority: high
depends_on: [V3-001, V3-008, V3-002, V3-003, V3-004]
area: protocol-governance
acceptance:
  - Governance direction distinguishes current v1 evidence substrate from future v3 audit-grade claims.
  - Profile defines proof-of-work records, audit events, authority grants, policy gates, risk exceptions, and audit exports.
  - Blind spots cover tamper evidence, identity and authority, evidence quality, runtime enforcement, and chain-of-thought boundaries.
  - Conformance expectations identify required validation, blocking behavior, secret rejection, append-oriented audit events, and export preservation.
  - Product boundaries distinguish MDSync governance UX from portable HA2HA governance records.
evidence:
  - "Added v3 governance schemas for proof-of-work records, audit events, policy gates, risk exceptions, evidence quality, and audit exports."
  - "Added `valid/v3-governance-only` fixture proving governance can be claimed independently."
  - "Added governance records to `valid/v3-engineering-team-workspace`, including audit events, policy gates, and audit export preservation."
  - "Added validator rules for blocked completion, secret leakage, and provider-payload leakage."
  - "`pnpm --filter @ha2ha/protocol test` passed with governance and audit fixture coverage."
---

## Intent

Define how HA2HA and MDSync should support agent governance, audit trails,
evidence quality, and proof-of-work without over-claiming current v1
capabilities.

## Current Evidence

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

## Acceptance

- Governance records remain portable protocol records, not product admin logs,
  provider traces, or legal compliance claims.
- Proof-of-work and audit event schemas are narrow enough to validate while
  still preserving actor, authority, evidence, approval, target coordinates, and
  file-history references.
- Governance blocking semantics compose with coordination, trust, evidence, and
  engineering profiles.

## Test Requirements

- Add valid and invalid fixtures for proof-of-work records, audit events,
  authority grants, policy gates, risk exceptions, and audit exports once
  schemas exist.
- Add negative tests for missing authority, missing evidence, unresolved review,
  stale checks, raw-token leakage, mutable audit events, and raw chain-of-thought
  storage.
- Add conformance coverage proving governance blocks completion when required
  proof, review, approval, or check state is missing, stale, rejected, or
  risk-accepted without authority.

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
