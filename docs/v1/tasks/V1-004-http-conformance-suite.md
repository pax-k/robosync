---
id: V1-004
title: Add HA2HA HTTP conformance suite
version: v1
state: ready
priority: high
depends_on: [V1-001, V1-002, V1-003]
area: conformance
acceptance:
  - Conformance suite checks raw listing, raw file reads, headers, actor-attributed updates, actor-attributed deletes, conflicts, versioned target coordinates, and status codes.
  - Suite can run against local MDSync using a base URL.
  - Output is machine-readable and identifies claimed profiles.
evidence: []
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
