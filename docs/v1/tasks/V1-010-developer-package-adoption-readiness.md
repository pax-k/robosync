---
id: V1-010
title: Harden HA2HA developer package adoption
version: v1
state: ready
priority: high
depends_on: [V1-003, V1-004, V1-008, V1-009]
area: developer-adoption
acceptance:
  - Public package naming follows the protocol split: planned portable HA2HA packages use `@ha2ha/*`, while hosted product packages use `@mdsync/*`.
  - `packages/ha2ha-protocol` and `packages/ha2ha-http` have release-ready metadata: `version`, description, license, repository or homepage, `main`, `types`, stable `exports`, `bin` entries, `files`, and publish policy.
  - Package exports target built artifacts or explicitly documented source artifacts; consumers do not need this monorepo or `workspace:*` resolution.
  - Package READMEs explain why a developer would install each package alone, with install commands, API snippets, CLI usage, maturity status, compatibility notes, and conformance expectations.
  - HA2HA client SDK readiness is tracked separately as `@ha2ha/client` in V1-012.
  - `npm pack --dry-run --json ./packages/ha2ha-protocol` and `npm pack --dry-run --json ./packages/ha2ha-http` pass and include the intended built files, examples, READMEs, and package metadata.
  - An empty-project install smoke test consumes packed tarballs or registry packages, imports the public APIs, runs the validator against a fixture, and runs HTTP conformance against a deterministic mock or documented local target.
  - Package publication, if performed, records registry evidence; if publication is deferred, docs clearly state that package adoption is repo-local only.
  - High-level tool or harness methods such as `ha2ha.readWorkspace`, `ha2ha.claimTask`, `ha2ha.addEvidence`, and `ha2ha.handoff` are not marketed as shipped until an SDK/client, adapter package, or installable skill package exists with tests and examples.
evidence:
  - "2026-07-08: `pnpm --filter @mdsync/ha2ha-protocol test` passed with 7 tests."
  - "2026-07-08: `pnpm --filter @mdsync/ha2ha-http test` passed with 6 tests."
  - "2026-07-08: `npm view @mdsync/ha2ha-protocol version` returned `404` from npm."
  - "2026-07-08: `npm view @mdsync/ha2ha-http version` returned `404` from npm."
  - "2026-07-08: `npm pack --dry-run --json ./packages/ha2ha-protocol` failed with `Invalid package, must have name and version`."
  - "2026-07-08: `npm pack --dry-run --json ./packages/ha2ha-http` failed with `Invalid package, must have name and version`."
---

## Intent

Make the existing HA2HA v1 package foundation easy for outside developers to
install and use without checking out the MDSync monorepo.

The v1 protocol already has real enforcement surfaces: constants, schemas,
validator tests, examples, HTTP conformance tests, a docs site, and measured
MDSync conformance. This task closes the distribution gap between repo-local
packages and external package adoption.

## Current Evidence

- [../sprint.md](../sprint.md) tracks v1 package, validator, conformance, docs,
  and skill work.
- [../protocol-adoption-and-ecosystem.md](../protocol-adoption-and-ecosystem.md)
  defines incremental adoption levels.
- `packages/ha2ha-protocol` exports constants, schemas, and validator APIs.
- `packages/ha2ha-http` exports HTTP conformance APIs.
- Both packages currently lack release metadata required by npm package dry-run.
- Neither package is published to the public npm registry as of 2026-07-08.

## Work

- Apply the `@ha2ha/*` public namespace decision for portable protocol packages
  and document any migration from current repo-local `@mdsync/ha2ha-*` names.
- Add release metadata and stable built exports to protocol and HTTP packages.
- Add CLI `bin` entries for validator and HTTP conformance.
- Add package-local READMEs with standalone install and usage examples.
- Decide whether examples ship inside `@mdsync/ha2ha-protocol` or in a separate
  fixture package.
- Add empty-project install smoke scripts that consume packed tarballs.
- Update docs and the HA2HA docs site once packages are installable.
- Keep installable skill-package readiness linked but separately tracked in
  [V1-011](V1-011-ha2ha-installable-skill-package.md) and
  [V2-009](../../v2/tasks/V2-009-mdsync-installable-skill-package.md).
- Keep the portable client SDK linked but separately tracked in
  [V1-012](V1-012-ha2ha-client-sdk.md).

## Acceptance

- External TypeScript consumers can install the protocol package and import
  constants, schemas, types, and validator helpers without monorepo aliases.
- CLI consumers can run workspace validation and HTTP conformance without
  invoking `pnpm --filter` inside this repository.
- Package docs are clear about what is stable v1 protocol, what is alpha skill
  guidance, and what remains future v3 adapter direction.
- Public docs do not imply that model, harness, SDK, or skill packages are
  shipped before those artifacts exist.

## Verification

```bash
pnpm --filter @mdsync/ha2ha-protocol test
pnpm --filter @mdsync/ha2ha-http test
npm pack --dry-run --json ./packages/ha2ha-protocol
npm pack --dry-run --json ./packages/ha2ha-http
npm view @mdsync/ha2ha-protocol version
npm view @mdsync/ha2ha-http version
```
