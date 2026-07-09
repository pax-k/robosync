---
id: V2-010
title: Document and ship MDSync client SDK
version: v2
state: done
priority: high
depends_on: [V1-012, V2-005, V2-008]
area: developer-adoption
acceptance:
  - `@mdsync/client` package contract is documented as the hosted MDSync product client.
  - Hosted product API surface is documented for workspace publishing, raw/API reads, versioned writes, dashboard links, comments, activity, history, stats, admin state, import/export, retention, and team-pilot flows.
  - Token and identity handling is documented with least-privilege guidance and secret-redaction expectations.
  - Product-only routes and read models are clearly separated from HA2HA protocol semantics.
  - MDSync installable skills can use the client instead of repo-local scripts.
  - Dogfood proof against local or deployed MDSync is required before claiming the SDK is ready for external adopters.
evidence:
  - "2026-07-08: V1-012 shipped `@ha2ha/client` from `packages/ha2ha-client`; `@mdsync/client` should depend one-way on it for portable protocol operations."
  - "2026-07-09: Shipped `@mdsync/client` from `packages/mdsync-client` with `tsdown`, `tsc -b`, README, typed result/error shapes, hosted product methods, and `createHa2haClient()`."
  - "2026-07-09: `pnpm --filter @mdsync/client test` passed with hosted route coverage, real route-shaped `version_conflict` parsing, token rejection checks, and HA2HA task/evidence bridge coverage."
  - "2026-07-09: `node scripts/mdsync-client-package-smoke.mjs` passed against packed tarballs installed into a temp project and a deterministic local MDSync mock server."
  - "2026-07-09: `npm pack --dry-run --json ./packages/mdsync-client` passed and produced a tarball containing README, package metadata, and built `dist` files."
  - "2026-07-09: Broad gates passed: `pnpm run check`, `pnpm run check-types`, `pnpm run test`, and `pnpm run build`."
---

## Intent

Create the hosted product client SDK for MDSync adopters.

The SDK should make MDSync easy to use as a service while preserving the
boundary between portable HA2HA protocol behavior and MDSync product behavior.

## Current Evidence

- [../client-sdk.md](../client-sdk.md) documents the intended SDK boundary.
- [V2-009](V2-009-mdsync-installable-skill-package.md) tracks installable
  MDSync skills and depends on this client.
- [../../v1/tasks/V1-012-ha2ha-client-sdk.md](../../v1/tasks/V1-012-ha2ha-client-sdk.md)
  shipped the portable HA2HA client SDK.
- The dedicated MDSync client SDK ships from `packages/mdsync-client`.
  `@mdsync/client` depends one-way on `@ha2ha/client`; the HA2HA client must
  not import MDSync product code.

## Work

- Create and document the package location for `@mdsync/client`.
- Wrap `@ha2ha/client` for portable workspace operations where useful.
- Add hosted MDSync helpers for workspace creation, token or identity handling,
  dashboard/raw/edit links, comments, activity, history, stats, admin state,
  import/export, retention, and team-pilot flows.
- Add install, usage, maturity, security, and compatibility docs.
- Add dogfood evidence against local or deployed MDSync.

## Acceptance

- External TypeScript consumers can install the client package and use it without
  monorepo aliases.
- The package documents every token, credential, identity, and product route it
  touches.
- Product helpers do not redefine HA2HA protocol compatibility.
- MDSync skill packages can use this client for hosted workflows without
  repo-local scripts.
- Dogfood evidence proves the client against local or deployed MDSync before
  public shipped claims.

## Verification

```bash
pnpm --filter @mdsync/client test
node scripts/mdsync-client-package-smoke.mjs
npm pack --dry-run --json ./packages/mdsync-client
pnpm run check
pnpm run check-types
pnpm run test
```
