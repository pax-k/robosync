# v1 Sprint: Full HA2HA Protocol

## Goal

Turn HA2HA from documented direction into an enforceable protocol with reusable packages, schemas, examples, validators, HTTP conformance checks, event/history profiles, a public docs site, and measured MDSync conformance.

## Current State

- v1 protocol docs define workspace conventions, HTTP profile, schemas, and conformance direction.
- `packages/ha2ha-protocol`, `packages/ha2ha-http`, and `apps/ha2ha` do not exist yet.
- MDSync v0 can become the first conformance target after v0 is verified.
- Event and file-history capabilities are protocol-level v1 work, not v2 product UI.

## Execution Order

1. Extract protocol constants into a standalone package.
2. Add schemas and valid/invalid examples.
3. Add validator API and CLI.
4. Add HTTP conformance checks.
5. Add event and file-history persistence/routes to MDSync.
6. Build the HA2HA docs site.
7. Publish MDSync conformance evidence.

## Tasks

- [V1-001 Protocol Package Constants](tasks/V1-001-protocol-package-constants.md)
- [V1-002 Schemas And Examples](tasks/V1-002-schemas-and-examples.md)
- [V1-003 Validator API And CLI](tasks/V1-003-validator-api-and-cli.md)
- [V1-004 HTTP Conformance Suite](tasks/V1-004-http-conformance-suite.md)
- [V1-005 MDSync Events And File History](tasks/V1-005-mdsync-events-and-file-history.md)
- [V1-006 HA2HA Docs Site](tasks/V1-006-ha2ha-docs-site.md)
- [V1-007 MDSync Conformance Evidence](tasks/V1-007-mdsync-conformance-evidence.md)

## Done Definition

- HA2HA package exports canonical constants, schemas, and validation helpers.
- Valid and invalid example workspaces exist and are checked.
- HTTP conformance can run against local MDSync.
- MDSync persists protocol events and durable file versions when claiming those profiles.
- `apps/ha2ha` documents protocol use without depending on MDSync internals.
- Conformance evidence identifies the exact MDSync profile claims.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
pnpm --filter @mdsync/ha2ha-protocol test
pnpm --filter @mdsync/ha2ha-http test
```
