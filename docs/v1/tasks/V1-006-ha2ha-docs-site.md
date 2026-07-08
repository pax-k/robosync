---
id: V1-006
title: Build HA2HA protocol docs site
version: v1
state: ready
priority: medium
depends_on: [V1-001, V1-002, V1-003]
area: docs-site
acceptance:
  - `apps/ha2ha` explains HA2HA independently from MDSync.
  - Site links to schemas, examples, validator usage, and conformance instructions.
  - MDSync is presented only as the first implementation.
evidence: []
---

## Intent

Create the public protocol home for HA2HA.

## Current Evidence

- `apps/ha2ha` does not exist.
- [../README.md](../README.md) identifies the protocol docs that need publication.

## Work

- Add the docs site app.
- Publish the core protocol, workspace convention, HTTP profile, schemas, examples, and conformance instructions.
- Keep implementation-provider details non-normative.

## Acceptance

- The site builds locally.
- Protocol docs remain understandable without running MDSync.

## Verification

```bash
pnpm run build
pnpm run check
```
