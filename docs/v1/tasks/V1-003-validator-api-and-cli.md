---
id: V1-003
title: Add HA2HA validator API and CLI
version: v1
state: ready
priority: high
depends_on: [V1-001, V1-002]
area: tooling
acceptance:
  - Validator reports structured errors with path, rule id, severity, message, and repair hint when obvious.
  - CLI validates example workspaces from the repo.
  - Validator checks actor attribution, target coordinates, minimal claim metadata, and minimal evidence metadata for v1 examples.
  - Validator can be used without MDSync server or web app.
evidence: []
---

## Intent

Turn HA2HA docs into an enforceable local check.

## Current Evidence

- Markdown protocol guidance exists.
- There is no validator package API or CLI.

## Work

- Implement validator API in the protocol package or a dedicated package.
- Add CLI command for validating workspace directories.
- Add tests against valid and invalid examples.
- Add stable rule IDs for missing actor, invalid target coordinate, invalid
  minimal claim metadata, invalid evidence metadata, and failed preservation
  expectations when import/export compatibility is claimed.

## Acceptance

- Validator output is deterministic and machine-readable.
- Valid examples pass and invalid examples fail with stable rule IDs.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm --filter @mdsync/ha2ha-protocol test
```
