---
id: V2-010
title: Document and ship MDSync client SDK
version: v2
state: ready
priority: high
depends_on: [V1-012, V2-005, V2-008, V2-009]
area: developer-adoption
acceptance:
  - `@mdsync/client` package contract is documented as the hosted MDSync product client.
  - Hosted product API surface is documented for workspace publishing, raw/API reads, versioned writes, dashboard links, comments, activity, history, stats, admin state, import/export, retention, and team-pilot flows.
  - Token and identity handling is documented with least-privilege guidance and secret-redaction expectations.
  - Product-only routes and read models are clearly separated from HA2HA protocol semantics.
  - MDSync installable skills can use the client instead of repo-local scripts.
  - Dogfood proof against local or deployed MDSync is required before claiming the SDK is ready for external adopters.
evidence:
  - "2026-07-08: No `@mdsync/client` package exists in `packages/`."
  - "2026-07-08: MDSync product skills currently reference future MDSync client packages, but no client package has shipped."
---

## Intent

Create the hosted product client SDK for MDSync adopters.

The SDK should make MDSync easy to use as a service while preserving the
boundary between portable HA2HA protocol behavior and MDSync product behavior.

## Current Evidence

- [../client-sdk.md](../client-sdk.md) documents the intended SDK boundary.
- [V2-009](V2-009-mdsync-installable-skill-package.md) tracks installable
  MDSync skills that should use this client.
- [../../v1/tasks/V1-012-ha2ha-client-sdk.md](../../v1/tasks/V1-012-ha2ha-client-sdk.md)
  tracks the portable HA2HA client SDK.
- There is no dedicated MDSync client SDK package as of 2026-07-08.

## Work

- Create or document the package location for `@mdsync/client`.
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
pnpm run check
pnpm run check-types
pnpm run test
npm pack --dry-run --json ./packages/mdsync-client
```
