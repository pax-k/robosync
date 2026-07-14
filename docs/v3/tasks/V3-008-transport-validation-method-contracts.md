---
id: V3-008
title: Define transport validation and method contracts
version: v3
state: done
priority: high
depends_on: [V3-001]
area: protocol-design
acceptance:
  - Transport, provisioning, validation, method, and failure-class boundaries are documented before profile schema work depends on them.
  - v3 does not turn HA2HA into agent RPC, an agent registry, or a real-time editor.
  - Workspace provisioning is explicitly optional unless adopted as a claimed profile.
  - Method contracts define inputs, outputs, allowed write sets, authority, baseVersion behavior, events, evidence, idempotency, retries, failures, and conformance expectations.
  - Validation output includes stable rule IDs, severity, profile impact, messages, and repair hints.
evidence:
  - "Added `packages/ha2ha-protocol/src/v3-constants.ts` with v3 method, profile, failure-class, fixture, and conformance-check constants."
  - "Added `packages/ha2ha-protocol/src/v3-schemas.ts` with first-slice method schemas for `workspace.validate`, `task.claim`, `task.handoff`, `evidence.add`, and `review.comment`."
  - "Added `packages/ha2ha-protocol/src/v3-validator.ts` and CLI support through `ha2ha-validate --v3`."
  - "Added valid and invalid v3 method fixtures, including `valid/v3-methods-only` and `invalid/v3-missing-required-method`."
  - "`pnpm --filter @ha2ha/protocol validate -- --v3 examples/valid/v3-engineering-team-workspace` passed."
---

## Intent

Define the cross-profile contracts before individual v3 profiles depend on
their own incompatible transport, validation, method, provisioning, or failure
semantics.

## Current Evidence

- [../transport-validation-methods.md](../transport-validation-methods.md) captures the target direction.
- v1 already defines HTTP routes, file operations, schemas, validators, and
  conformance checks.
- v3 coordination, trust, evidence/review, and engineering profiles need shared
  operation semantics so each profile does not invent incompatible behavior.

## Work

- Decide whether workspace creation, import, export, snapshot, restore, and
  validation belong in an optional provisioning profile.
- Define the first protocol-owned method names and their boundaries.
- Define method contract fields: input, output, write set, actor, authority,
  `baseVersion`, events, evidence, idempotency, retry, conflict, and blocking
  failure behavior.
- Define shared failure classes for validation, conflict, authority, state,
  evidence, review, external availability, unsupported profile, and human-input
  stops.
- Decide whether method attempts are recorded as operation records, event
  records, or only as resulting file changes.
- Define validation output shape and profile-blocking behavior.
- Add conformance expectations for claimed transport, provisioning,
  validation, and method profiles.

## Acceptance

- The contract boundaries are clear enough for downstream profile schemas and
  validators.
- Workspace provisioning remains optional unless explicitly claimed as a
  profile.
- Method semantics preserve v1 `baseVersion`, conflict, event, and file-history
  behavior.

## Test Requirements

- Add docs validation or searchable checks proving each method defines inputs,
  outputs, write sets, actor, authority, `baseVersion`, events, evidence,
  idempotency, retries, failures, and conformance impact.
- Add valid and invalid fixtures for the first cross-profile methods once v3
  schemas exist.
- Add negative tests proving v3 methods do not require real-time delivery,
  provider-specific payloads, or agent RPC semantics.

## Out Of Scope

- Implementing v3 schemas or validators.
- Choosing an auth provider.
- Choosing an agent runtime or model provider.
- Defining provider-specific Git, issue, chat, or CI payloads.
- Requiring real-time delivery for protocol conformance.

## Verification

```bash
rg -n "transport|validation|method|provisioning|failure" docs/v3
pnpm run check
```
