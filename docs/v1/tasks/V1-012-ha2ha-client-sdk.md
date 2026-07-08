---
id: V1-012
title: Document and ship HA2HA client SDK
version: v1
state: done
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
  - "2026-07-08: Added `packages/ha2ha-client` as `@ha2ha/client` with local-folder and HTTP transports, structured result types, typed `version_conflict` errors, package README, built exports, and install smoke."
  - "2026-07-08: `pnpm --filter @ha2ha/client test` passed with 3 tests."
  - "2026-07-08: `node scripts/ha2ha-client-package-smoke.mjs` passed by packing/installing `@ha2ha/client`, running HTTP transport against the deterministic local server, running a local-folder claim/evidence flow, and validating the resulting workspace."
  - "2026-07-08: `npm pack --dry-run --json ./packages/ha2ha-client` passed and listed `dist`, `README.md`, and `package.json` in `ha2ha-client-0.1.0.tgz`."
  - "2026-07-08: `pnpm run test:ha2ha-packages` passed with `{ ok: true, package: \"@ha2ha/client\" }` for the client package smoke."
  - "2026-07-08: `pnpm run check`, `pnpm run check-types`, `pnpm run test`, and `pnpm run build` passed with `@ha2ha/client` included in the workspace."
  - "2026-07-08: `pnpm --filter ha2ha build` passed after switching the docs app to the browser-safe `@ha2ha/protocol/constants` import."
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
- `packages/ha2ha-client` now ships the portable HA2HA client SDK as
  `@ha2ha/client`.
- The package is tarball-installable and registry-ready; npm publication is
  deferred until an explicit publish step.

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
pnpm --filter @ha2ha/client test
npm pack --dry-run --json ./packages/ha2ha-client
node scripts/ha2ha-client-package-smoke.mjs
pnpm run test:ha2ha-packages
pnpm run check
pnpm run check-types
pnpm run test
pnpm run build
```
