# Team Control Plane

## Status

Source mode: founder-fed plus repository evidence.

This document captures the v4 MDSync product direction for tenants, teams,
aggregate workspace administration, and high-level operational control.

It is product architecture, not HA2HA protocol authority.

## Why This Exists

Per-workspace MDSync already has useful product admin surfaces: activity,
history, comments, file versions, conflicts, cleanup state, retention state,
storage stats, and capability controls.

That is not enough once a team runs many workspaces. A team admin needs to
answer questions across the whole body of work:

- Which workspaces are active?
- Which workspaces need attention?
- Which tasks are blocked, stale, or missing evidence?
- Which agents or service accounts are acting?
- Which conflicts, failed checks, cleanup failures, or retention issues are
  recurring?
- Which integrations and tokens are active?
- Which workspace should an admin open next?
- What happened across the team during an incident, audit, or customer review?

The v4 product wedge is:

```txt
a hosted control plane for all human-agent workspaces under a team
```

## Current Repository Evidence

- `workspaces` is currently the root product object.
- `workspace_events` stores HA2HA protocol activity.
- `workspace_admin_events` stores MDSync product-only operational events.
- Per-workspace admin stats already aggregate files, versions, comments,
  protocol events, conflicts, storage, cleanup, retention, and health.
- Product identity exists as Better Auth user/session tables, but team
  membership and team authorization are not modeled yet.

## Control-Plane Model

```txt
team
  id, slug, name, plan, settings
  members
  service accounts
  integrations
  audit events
  usage and limits
  retention and security policy
  workspaces[]

workspace
  team_id
  title
  access mode
  files
  file versions
  HA2HA protocol events
  product comments
  product admin events
```

The workspace remains the source of shared work state. The team control plane
indexes, aggregates, filters, and governs many workspace records.

## Authorization

Team-scoped product routes should require authenticated team identity:

- user session with team membership
- service account token scoped to one team
- future provider integration acting under a team grant

Workspace capability links should remain workspace-scoped:

- a read link can read one workspace
- an edit link can mutate one workspace according to current workspace rules
- neither should unlock team dashboards, aggregate logs, billing, member
  management, or cross-workspace controls

This preserves the existing public and token-link workflow while making team
administration safe enough for hosted product use.

## Roles

Initial roles should be boring and enforceable:

| Role | Can view team dashboards | Can edit workspaces | Can administer team |
| --- | --- | --- | --- |
| owner | yes | yes | yes |
| admin | yes | yes | yes, except ownership transfer and deletion |
| member | yes | yes, where workspace policy allows |
| viewer | yes | no |
| service-account | scoped | scoped | no by default |

Role semantics should be product-owned until a future HA2HA trust profile
defines portable role records.

## Team Control Panel

The first v4 control panel should prioritize read-mostly operational visibility:

- workspace inventory
- active and stale workspaces
- recent activity across workspaces
- team health summary
- conflicts and stale-write hotspots
- unresolved comments and review blockers
- task state summary across workspaces
- missing or stale evidence when task conventions allow detection
- cleanup, retention, and storage state
- active capability links, service accounts, and integration status
- audit log feed
- next required action

Mutating controls can follow once audit events and permission checks are
reliable:

- rotate or revoke workspace links
- archive, restore, import, export, or transfer workspaces
- apply retention policy
- retry cleanup
- create service accounts
- connect or revoke integrations
- record risk exceptions or approvals when governance profiles exist

Every mutating team-control action should emit a product audit event.

## Aggregate Stats

Team stats are product projections. They should be derivable from workspace and
product tables, not required protocol records.

Useful first aggregates:

- total workspaces
- active workspaces by time window
- files, versions, and storage bytes
- protocol events by type
- product admin events by type
- conflicts by workspace, path, and actor
- comments by resolved state
- tasks by frontmatter state
- stale workspaces
- workspaces with health issues
- service accounts by last use
- integration sync status

Keep aggregate stats queryable from canonical tables at first. Add snapshots or
daily rollups only when performance or billing evidence justifies it.

## Routing

Keep existing workspace and raw routes stable:

```txt
/w/:workspaceId
/w/:workspaceId/raw
/api/workspaces/:workspaceId
```

Add team product routes separately:

```txt
/teams/:teamSlug
/teams/:teamSlug/workspaces
/teams/:teamSlug/activity
/teams/:teamSlug/logs
/teams/:teamSlug/settings

/api/teams/:teamId
/api/teams/:teamId/workspaces
/api/teams/:teamId/stats
/api/teams/:teamId/audit-events
/api/teams/:teamId/service-accounts
/api/teams/:teamId/integrations
```

Route names can change during implementation. The important rule is that
workspace protocol routes remain usable without understanding team dashboards.

## Workspace Lifecycle

v4 should support three workspace ownership modes:

1. **Team workspace**: normal v4 state. The workspace has a `team_id`.
2. **Personal team workspace**: a signed-in user's default team owns the
   workspace.
3. **Legacy link workspace**: existing or anonymous workspace with no `team_id`.
   It keeps working and can be claimed or imported into a team later.

New hosted workspaces should prefer mode 1 or 2. Legacy mode exists for
compatibility and migration only.

## Open Decisions

- Should a team member's role grant workspace edit permission automatically, or
  should each workspace also have a local access policy?
- Should team audit events be hash chained before enterprise positioning?
- Should R2 object keys move to `teams/<teamId>/workspaces/<workspaceId>` for
  new workspaces, or stay workspace-keyed until isolation evidence requires the
  move?
- Which team stats should be live queries versus persisted daily rollups?
- Which control-panel actions are safe in v4.0, and which should wait for v3
  governance or evidence profiles?

