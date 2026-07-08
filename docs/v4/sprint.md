# v4 Sprint: Team And Tenant Control Plane

## Goal

Define and build the MDSync team/tenant layer that can host many HA2HA
workspaces under one team and provide aggregate visibility, logs, operational
controls, identity, service accounts, integrations, retention, and audit state.

## Current State

- v1 keeps HA2HA workspace semantics portable.
- v2 has product UX and per-workspace admin stats.
- v3 defines future collaboration, trust, evidence, governance, and
  engineering protocol direction.
- The current application stores users and sessions, but not teams or team
  membership.
- Current workspace admin APIs are authorized by workspace write capability.
- Team dashboards must not be unlocked by shared workspace edit links.

## Execution Order

1. Define team identity, membership, and workspace ownership.
2. Add team aggregate stats, logs, and audit-event design.
3. Design the team control panel as a read-mostly operational surface.
4. Define migration and capability-link coexistence.
5. Implement schemas, authorization, APIs, UI, and tests after the docs settle.

## Tasks

- [V4-001 Team Identity And Workspace Ownership](tasks/V4-001-team-identity-and-workspace-ownership.md)
- [V4-002 Team Aggregate Stats And Logs](tasks/V4-002-team-aggregate-stats-logs.md)
- [V4-003 Team Control Panel UX](tasks/V4-003-team-control-panel-ux.md)
- [V4-004 Migration And Capability Links](tasks/V4-004-migration-and-capability-links.md)

## Done Definition

- v4 docs distinguish team product scope from HA2HA protocol scope.
- New hosted workspaces have a clear team ownership model.
- Existing workspace and raw routes remain compatible.
- Team aggregate stats and logs are product projections over canonical
  workspace state.
- Team dashboards require session or service-account identity.
- Capability links remain workspace-scoped and do not grant team-admin access.
- Mutating team-control actions have audit-event requirements.
- The first control panel is read-mostly before broad admin actions are added.
- Tests cover team membership authorization, workspace ownership, aggregate
  queries, audit events, and legacy capability-link behavior when implemented.

## Verification Commands

```bash
rg -n "team|tenant|control panel|audit|aggregate|capability|service account" docs/v4 docs/README.md
pnpm run check
```

