---
id: V1-012
title: Document and ship HA2HA client SDK
version: v1
state: ready
priority: high
depends_on: [V1-010]
area: developer-adoption
acceptance:
  - `@ha2ha/client` package contract is documented as the portable HA2HA protocol client.
  - Dependency boundary is explicit: the client may depend on `@ha2ha/protocol` and must not depend on MDSync product packages, auth, dashboards, comments, DB, UI, product stats, or provider sync.
  - Public API categories are listed for workspace validation, workspace reads, file reads, versioned writes/deletes, conflict results, task claims, evidence, decisions, handoffs, and transports.
  - Local-folder and HTTP-profile transports are scoped as the first supported transport targets.
  - Empty-project install smoke is required before any shipped claim.
  - Conformance or dogfood proof is required before claiming the SDK is ready for external adopters.
evidence:
  - "2026-07-08: No `@ha2ha/client` package exists in `packages/`."
  - "2026-07-08: SDK-like method names such as `ha2ha.readWorkspace`, `ha2ha.claimTask`, `ha2ha.addEvidence`, and `ha2ha.handoff` exist only as target adapter contracts in docs."
---

## Intent

Create the portable client SDK for HA2HA adopters.

The SDK should let apps, CLIs, agent skills, MCP tools, internal harnesses,
desktop apps, and competing implementations integrate with HA2HA without
reimplementing raw file, HTTP, validation, conflict, actor, and evidence
semantics.

## Current Evidence

- [../client-sdk.md](../client-sdk.md) documents the intended SDK boundary.
- [V1-010](V1-010-developer-package-adoption-readiness.md) tracks package
  readiness and installability.
- `packages/ha2ha-protocol` currently holds constants, schemas, examples, and
  validator APIs.
- `packages/ha2ha-http` currently holds HTTP conformance tooling.
- There is no dedicated HA2HA client SDK package as of 2026-07-08.

## Work

- Create or document the package location for `@ha2ha/client`.
- Define public API categories without coupling to MDSync product behavior.
- Reuse protocol schemas and result types where possible.
- Add local-folder and HTTP-profile transport adapters.
- Add install, usage, maturity, and compatibility docs.
- Add empty-project install smoke and dogfood or conformance evidence.

## Acceptance

- External TypeScript consumers can install the client package and use it without
  monorepo aliases or MDSync product dependencies.
- File updates and deletes preserve `actor` and `baseVersion` behavior.
- Conflict responses are exposed as typed results that include the latest target
  coordinate.
- Task claim, evidence, decision, and handoff helpers write v1-compatible
  records without claiming v3 coordination semantics.
- Public docs distinguish this SDK from MDSync product integration tooling.

## Verification

```bash
pnpm run check
pnpm run check-types
npm pack --dry-run --json ./packages/ha2ha-client
```
