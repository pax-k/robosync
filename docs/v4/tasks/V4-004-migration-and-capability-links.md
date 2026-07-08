---
id: V4-004
title: Define migration and capability-link coexistence
version: v4
state: planned
priority: high
depends_on: [V4-001]
area: migration
acceptance:
  - Existing `/w/:workspaceId` and raw routes remain stable.
  - Capability links remain workspace-scoped.
  - Capability links do not grant team dashboard or aggregate-log access.
  - Legacy workspaces can be imported or claimed into a team through a documented product workflow.
  - Migration preserves existing files, versions, events, comments, admin events, and object keys.
evidence: []
---

# V4-004 Migration And Capability Links

## Intent

Move MDSync toward team-owned workspaces without breaking existing workspace
URLs, raw routes, scripts, or capability-link workflows.

## Work

- Define `legacy_link`, `personal_team`, and `team` ownership modes.
- Keep workspace and raw routes stable.
- Add product workflow for claiming or importing a legacy workspace into a
  team.
- Define what evidence or token proof is required to claim a legacy workspace.
- Preserve capability-link read and edit behavior for workspace-scoped access.
- Block capability links from team dashboards, aggregate stats, logs, billing,
  member management, service accounts, and integrations.

## Out Of Scope

- Requiring all HA2HA implementations to support teams.
- Breaking existing hosted workspace links.
- Moving object storage prefixes before isolation or migration evidence exists.

## Verification

```bash
rg -n "legacy_link|capability|/w/:workspaceId|raw routes|import|claim" docs/v4
pnpm run check
```

