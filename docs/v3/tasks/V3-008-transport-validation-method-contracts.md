---
id: V3-008
title: Define transport validation and method contracts
area: protocol
status: planned
acceptance:
  - Transport, provisioning, validation, method, and failure-class boundaries are documented before profile schema work depends on them.
  - v3 does not turn HA2HA into agent RPC, an agent registry, or a real-time editor.
  - Workspace provisioning is explicitly optional unless adopted as a claimed profile.
  - Method contracts define inputs, outputs, allowed write sets, authority, baseVersion behavior, events, evidence, idempotency, retries, failures, and conformance expectations.
  - Validation output includes stable rule IDs, severity, profile impact, messages, and repair hints.
evidence: []
---

# V3-008 Transport Validation Method Contracts

## Goal

Define the cross-profile contracts that individual v3 profiles depend on:
transport, workspace provisioning, validation, durable method semantics, and
shared failure classes.

## Context

- [../transport-validation-methods.md](../transport-validation-methods.md)
  captures the target direction.
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
