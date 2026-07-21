# v1 Sprint: Full HA2HA Protocol

## Goal

Turn HA2HA from documented direction into an enforceable protocol with reusable packages, schemas, examples, validators, HTTP conformance checks, event/history profiles, a public docs site, measured MDSync conformance, and an honest external developer adoption path.

## Current State

- v1 protocol docs define workspace conventions, HTTP profile, schemas, and conformance direction.
- `packages/ha2ha-protocol` exports constants, schemas, examples, and validator APIs.
- `packages/ha2ha-http` runs the HA2HA HTTP conformance suite against mock and live targets.
- MDSync is the first measured conformance target for core workspace, workspace convention, HTTP, event, and file-history profiles.
- Deployed MDSync conformance passes at `https://sync-api.ha2ha.md`.
- `apps/ha2ha` publishes the protocol docs independently from MDSync product UX at `https://ha2ha.md`.
- Event and file-history capabilities are protocol-level v1 work, not v2 product UI.
- The core HA2HA agent skill alpha remains historical repo-local evidence for
  V1-008.
- `@ha2ha/protocol` and `@ha2ha/http` are registry-ready, tarball-installable
  protocol packages built from the existing `packages/ha2ha-protocol` and
  `packages/ha2ha-http` directories. npm publication is deferred until an
  explicit publish step.
- `@ha2ha/skills` is the installable, protocol-only HA2HA skill package. MDSync
  product skills remain v2 work.
- `@ha2ha/client` is the portable protocol SDK for local folders and conformant
  HA2HA HTTP implementations. `@mdsync/client` remains v2 hosted product work.

## Execution Order

1. Extract protocol constants into a standalone package.
2. Add schemas and valid/invalid examples.
3. Add validator API and CLI.
4. Add HTTP conformance checks.
5. Add event and file-history persistence/routes to MDSync.
6. Build the HA2HA docs site.
7. Publish MDSync conformance evidence.
8. Ship a core HA2HA agent skill alpha over the validated protocol surface.
9. Backfill automated regression tests for existing v0/v1 behavior.
10. Harden HA2HA packages for external developer adoption.
11. Package first-party HA2HA protocol skills for installation.
12. Document and ship the HA2HA client SDK.

## Tasks

- [V1-001 Protocol Package Constants](tasks/V1-001-protocol-package-constants.md)
- [V1-002 Schemas And Examples](tasks/V1-002-schemas-and-examples.md)
- [V1-003 Validator API And CLI](tasks/V1-003-validator-api-and-cli.md)
- [V1-004 HTTP Conformance Suite](tasks/V1-004-http-conformance-suite.md)
- [V1-005 MDSync Events And File History](tasks/V1-005-mdsync-events-and-file-history.md)
- [V1-006 HA2HA Docs Site](tasks/V1-006-ha2ha-docs-site.md)
- [V1-007 MDSync Conformance Evidence](tasks/V1-007-mdsync-conformance-evidence.md)
- [V1-008 Core HA2HA Agent Skill Alpha](tasks/V1-008-core-ha2ha-agent-skill-alpha.md)
- [V1-009 Automated Regression Backfill](tasks/V1-009-automated-regression-backfill.md)
- [V1-010 HA2HA Developer Package Adoption Readiness](tasks/V1-010-developer-package-adoption-readiness.md)
- [V1-011 HA2HA Installable Skill Package](tasks/V1-011-ha2ha-installable-skill-package.md)
- [V1-012 HA2HA Client SDK](tasks/V1-012-ha2ha-client-sdk.md)

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
- Existing done behavior has automated regression coverage or a documented
  live-harness gap.
- Public package claims distinguish source-level availability from registry or
  tarball availability, with package dry-run and empty-project install evidence
  before claiming easy external adoption.
- First-party skill claims distinguish the historical repo-local alpha from the
  installable HA2HA skill package, with package validation and at least one
  dogfood trial.
- HA2HA client SDK claims are backed by the shipped `@ha2ha/client` package,
  with install smoke and HTTP/local-folder dogfood proof.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
pnpm run test
pnpm run test:e2e
pnpm --filter @ha2ha/protocol test
pnpm --filter @ha2ha/http test
pnpm --filter @ha2ha/skills test
pnpm --filter @ha2ha/client test
npm pack --dry-run --json ./packages/ha2ha-protocol
npm pack --dry-run --json ./packages/ha2ha-http
npm pack --dry-run --json ./packages/ha2ha-skills
npm pack --dry-run --json ./packages/ha2ha-client
pnpm run test:ha2ha-packages
```
