---
id: V1-004
title: Add HA2HA HTTP conformance suite
version: v1
state: done
priority: high
depends_on: [V1-001, V1-002, V1-003]
area: conformance
acceptance:
  - Conformance suite checks raw listing, raw file reads, headers, actor-attributed updates, actor-attributed deletes, conflicts, versioned target coordinates, and status codes.
  - Suite can run against local MDSync using a base URL.
  - Output is machine-readable and identifies claimed profiles.
evidence:
  - "2026-07-08: Added packages/ha2ha-http with a machine-readable HA2HA HTTP conformance runner and CLI."
  - "2026-07-08: Conformance checks cover workspace create/setup, raw listing, raw file headers, tree reads, JSON file reads, actor-required updates, actor/baseVersion updates, stale conflict target coordinates, actor file create, actor/baseVersion delete, and delete baseVersion requirements."
  - "2026-07-08: pnpm --filter @mdsync/ha2ha-http test passed against a conforming mock implementation."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: ROBOSYNC_SERVER_ONLY=1 pnpm --filter @mdsync/infra dev started local MDSync at http://localhost:3000."
  - "2026-07-08: HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance passed 13/13 checks for local workspace n94eobZ3-a-c."
---

## Intent

Measure whether an implementation supports the HA2HA HTTP profile.

## Current Evidence

- [../http-profile.md](../http-profile.md) defines required routes and headers.
- [../conformance.md](../conformance.md) defines conformance levels.
- No conformance suite exists yet.

## Work

- Add HTTP conformance checks.
- Include setup, action, assertion, and evidence output.
- Check that updates and deletes require actor handles, deletes require
  `baseVersion`, and conflict metadata includes `workspaceId`, `path`, and
  `version`.
- Keep product-specific MDSync details behind configuration.

## Acceptance

- A local implementation can be checked with one command.
- Failures identify exact missing or mismatched protocol behavior.

## Verification

```bash
pnpm --filter @mdsync/ha2ha-http test
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
```
