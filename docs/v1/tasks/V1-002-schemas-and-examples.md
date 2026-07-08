---
id: V1-002
title: Add HA2HA schemas and examples
version: v1
state: done
priority: high
depends_on: [V1-001]
area: protocol
acceptance:
  - Schemas exist for workspace manifest, task frontmatter, participant frontmatter, evidence metadata, target coordinates, events, file versions, and conflict responses.
  - Valid and invalid example workspaces cover core, event, and history behavior.
  - Examples cover actor-attributed file writes, minimal task claims, minimal evidence metadata, and import/export preservation expectations.
  - Examples are portable and do not require MDSync to run.
evidence:
  - "2026-07-08: Added HA2HA schemas in packages/ha2ha-protocol/src/schemas.ts for manifest, task frontmatter, participant frontmatter, evidence metadata, target coordinates, events, file versions, conflict responses, actor-attributed file writes, deletes, and task claims."
  - "2026-07-08: Added 41 portable example fixture files under packages/ha2ha-protocol/examples covering valid core, multi-participant task, event/history, and named invalid cases."
  - "2026-07-08: pnpm --filter @mdsync/ha2ha-protocol test passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run check passed."
---

## Intent

Make HA2HA validation concrete through schemas and fixtures.

## Current Evidence

- [../schemas-and-validation.md](../schemas-and-validation.md) defines the required schema surfaces.
- No schema or fixture package exists yet.

## Work

- Add schema files under the protocol package.
- Add valid and invalid fixture workspaces.
- Include invalid fixtures for missing actor, invalid target coordinate,
  invalid evidence metadata, and claim updates that do not set `state`,
  `owner`, and `updated_by`.
- Keep implementation-provider details out of normative examples.

## Acceptance

- Schemas and examples represent the v1 protocol docs.
- Invalid examples fail for deliberate, named reasons once the validator exists.
- Import/export fixtures preserve v1 paths, manifests, tasks, participants,
  evidence, decisions, logs, and claimed event/history records.

## Verification

```bash
pnpm run check-types
pnpm run check
```
