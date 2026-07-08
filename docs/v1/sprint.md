# v1 Sprint: Full HA2HA Protocol

## Goal

Turn HA2HA from documented direction into an enforceable protocol with reusable packages, schemas, examples, validators, HTTP conformance checks, event/history profiles, a public docs site, and measured MDSync conformance.

## Current State

- v1 protocol docs define workspace conventions, HTTP profile, schemas, and conformance direction.
- `packages/ha2ha-protocol` exports constants, schemas, examples, and validator APIs.
- `packages/ha2ha-http` runs the HA2HA HTTP conformance suite against mock and live targets.
- MDSync is the first measured conformance target for core workspace, workspace convention, HTTP, event, and file-history profiles.
- Deployed MDSync conformance passes at `https://mdsync-server-pax.pax.workers.dev`.
- `apps/ha2ha` publishes the protocol docs independently from MDSync product UX.
- Event and file-history capabilities are protocol-level v1 work, not v2 product UI.
- The core HA2HA agent skill alpha exists as a repo-local Codex skill package.

## Execution Order

1. Extract protocol constants into a standalone package.
2. Add schemas and valid/invalid examples.
3. Add validator API and CLI.
4. Add HTTP conformance checks.
5. Add event and file-history persistence/routes to MDSync.
6. Build the HA2HA docs site.
7. Publish MDSync conformance evidence.
8. Ship a core HA2HA agent skill alpha over the validated protocol surface.

## Tasks

- [V1-001 Protocol Package Constants](tasks/V1-001-protocol-package-constants.md)
- [V1-002 Schemas And Examples](tasks/V1-002-schemas-and-examples.md)
- [V1-003 Validator API And CLI](tasks/V1-003-validator-api-and-cli.md)
- [V1-004 HTTP Conformance Suite](tasks/V1-004-http-conformance-suite.md)
- [V1-005 MDSync Events And File History](tasks/V1-005-mdsync-events-and-file-history.md)
- [V1-006 HA2HA Docs Site](tasks/V1-006-ha2ha-docs-site.md)
- [V1-007 MDSync Conformance Evidence](tasks/V1-007-mdsync-conformance-evidence.md)
- [V1-008 Core HA2HA Agent Skill Alpha](tasks/V1-008-core-ha2ha-agent-skill-alpha.md)

## Done Definition

- HA2HA package exports canonical constants, schemas, and validation helpers.
- Valid and invalid example workspaces exist and are checked.
- HTTP conformance can run against local MDSync and checks actor attribution,
  versioned target coordinates, update/delete `baseVersion` behavior, and
  conflict responses.
- MDSync persists protocol events and durable file versions when claiming those profiles.
- Minimal task claim and evidence metadata are documented, schematized, and
  validated without pulling in v3 leases, approvals, trust, review, checks, or
  engineering references.
- `apps/ha2ha` documents protocol use without depending on MDSync internals.
- Conformance evidence identifies the exact MDSync profile claims.
- A core agent skill alpha proves publish, read, update, conflict, status, task,
  and evidence workflows without claiming v3 engineering-team governance.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
pnpm --filter @mdsync/ha2ha-protocol test
pnpm --filter @mdsync/ha2ha-http test
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
```
