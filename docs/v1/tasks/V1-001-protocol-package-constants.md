---
id: V1-001
title: Create HA2HA protocol constants package
version: v1
state: done
priority: high
depends_on: []
area: protocol
acceptance:
  - Package exports canonical filenames, directories, task states, capability names, actor field names, target coordinate field names, evidence metadata field names, and header names.
  - Package has no dependency on MDSync server, web, Cloudflare, D1, R2, Better Auth, Next.js, or Hono.
  - MDSync can consume the constants without introducing dependency cycles.
evidence:
  - "2026-07-08: Added packages/ha2ha-protocol with canonical protocol constants and type exports."
  - "2026-07-08: apps/server imports HA2HA headers and conflict constants from @mdsync/ha2ha-protocol without dependency cycles."
  - "2026-07-08: pnpm --filter @mdsync/ha2ha-protocol test passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run check passed."
---

## Intent

Create the stable package boundary for HA2HA protocol primitives.

## Current Evidence

- Protocol constants are currently expressed in docs only.
- `packages/ha2ha-protocol` does not exist.

## Work

- Add the protocol package.
- Export constants for workspace paths, task states, actor attribution, target
  coordinates, evidence metadata, and `X-HA2HA-*` headers.
- Add basic package-level tests or type checks.

## Acceptance

- The package is useful without running MDSync.
- Runtime code can import protocol constants in a later task.

## Verification

```bash
pnpm run check-types
pnpm run check
```
