# v4: MDSync Team Control Plane

v4 is the MDSync product track for teams, tenants, and cross-workspace
operations.

The v4 move is to introduce a durable product control plane above HA2HA
workspaces:

```txt
team / tenant
  owns identity, membership, policy, service accounts, integrations, billing,
  retention, audit logs, and aggregate operations

workspace
  remains the portable HA2HA work ledger with files, versions, events, tasks,
  evidence, comments, and workspace-scoped admin state

team control panel
  aggregates work across many workspaces and exposes operational visibility,
  logs, policy state, and high-level controls

dashboard-authored work
  lets humans create work intent, constraints, and review gates first so
  eligible agents can pick up the work later
```

## Product Boundary

HA2HA should not need a team or tenant concept to remain useful. A conforming
workspace can still exist as portable files plus versioned events.

MDSync v4 adds the hosted product boundary teams need when one workspace is no
longer enough:

- multiple workspaces under one team
- human users, roles, and service accounts
- aggregate activity, health, and usage
- team-level audit logs
- workspace inventory and lifecycle controls
- retention, token, integration, and policy settings
- admin views for work in progress, blockers, evidence, conflicts, and cleanup
- board-style work authoring where dashboard cards materialize to workspace
  tasks and agent inboxes

## Naming

Use **team** in product UX and docs. Use **tenant** for implementation concerns
where isolation, billing, limits, storage prefixes, and operational ownership
matter.

The initial product model should treat one team as one tenant. That keeps the
schema and authorization model simple while leaving room for enterprise account
hierarchies later.

## Relationship To Earlier Tracks

- v1 remains the HA2HA protocol authority.
- v2 remains MDSync product UX over individual workspaces.
- v3 remains future HA2HA collaboration, trust, evidence, engineering, and
  governance protocol direction.
- v4 is MDSync hosted product control-plane scope. It may use v3 records when
  they exist, but it should not move team membership, billing, or hosted admin
  dashboards into the open protocol.

## Files

- [sprint.md](sprint.md)
- [tasks/](tasks/)
- [team-control-plane.md](team-control-plane.md)
- [top-down-work-orchestration.md](top-down-work-orchestration.md)
- [vertical-room-flows.md](vertical-room-flows.md)
- [product-data-model.md](product-data-model.md)

## Core Decisions

1. New signed-in users should receive an auto-created personal team.
2. New hosted workspaces should belong to a team.
3. Legacy capability-link workspaces should keep working and can be imported
   into a team later.
4. `/w/:workspaceId` and raw HA2HA routes should stay stable.
5. Team dashboards should use session or service-account identity, not shared
   workspace edit links.
6. The first team control panel should be read-mostly: aggregate state,
   interpret logs, expose health, and show next required action before adding
   broad mutating controls.
7. Dashboard-authored work should write durable workspace records before it is
   offered to agents as portable HA2HA work.
8. The first top-down agent pickup surface should be pull mode through an agent
   inbox. Event delivery and hosted runners can follow later.
9. Domain-specific rooms should reuse the same v4 control-plane substrate:
   human intent in UI, durable workspace records, bounded agent pickup,
   evidence-backed review, and human approval before publication or closure.
