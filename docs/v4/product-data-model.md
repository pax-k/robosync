# v4 Product Data Model

v4 product tables introduce team ownership above workspaces. These tables are
MDSync hosted product scope. They are not required for HA2HA conformance.

The shapes below are design targets, not committed migrations.

## Teams

```sql
create table teams (
  id text primary key,
  slug text not null unique,
  name text not null,
  plan text not null default 'free',
  settings_json text not null default '{}',
  created_at text not null,
  updated_at text not null
);
```

`teams` is the user-facing object. In implementation and billing discussions,
one team is one tenant until there is evidence for account hierarchies.

## Team Members

```sql
create table team_members (
  team_id text not null,
  user_id text not null,
  role text not null,
  status text not null default 'active',
  invited_by text,
  created_at text not null,
  updated_at text not null,
  primary key (team_id, user_id),
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (user_id) references user(id) on delete cascade
);
```

Initial roles: `owner`, `admin`, `member`, and `viewer`.

Team membership is the authority for team dashboards, aggregate stats, logs,
settings, billing, service accounts, integrations, and cross-workspace actions.

## Workspace Ownership

```sql
alter table workspaces add column team_id text references teams(id);
alter table workspaces add column created_by_user_id text references user(id);
alter table workspaces add column ownership_mode text not null default 'legacy_link';
```

`ownership_mode` should start narrow:

- `team`: workspace belongs to an explicit shared team.
- `personal_team`: workspace belongs to a user's default personal team.
- `legacy_link`: workspace is still governed by capability links only.

The nullable `team_id` preserves existing workspaces and capability URLs during
migration.

## Team Service Accounts

```sql
create table team_service_accounts (
  id text primary key,
  team_id text not null,
  name text not null,
  token_hash text,
  role text not null default 'service-account',
  scopes_json text not null default '[]',
  last_used_at text,
  revoked_at text,
  created_by_user_id text,
  created_at text not null,
  updated_at text not null,
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (created_by_user_id) references user(id) on delete set null
);
```

Service accounts are for agents, provider sync jobs, and automation. Store only
token hashes. Emit audit events on create, rotate, revoke, and use for
sensitive actions.

## Team Integrations

```sql
create table team_integrations (
  id text primary key,
  team_id text not null,
  provider text not null,
  external_account_id text,
  display_name text,
  status text not null,
  scopes_json text not null default '[]',
  config_json text not null default '{}',
  last_sync_at text,
  created_by_user_id text,
  created_at text not null,
  updated_at text not null,
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (created_by_user_id) references user(id) on delete set null
);
```

Integrations are product adapters. Provider-specific payloads should not leak
into HA2HA protocol records.

## Team Boards

```sql
create table team_boards (
  id text primary key,
  team_id text not null,
  workspace_id text,
  name text not null,
  settings_json text not null default '{}',
  created_by_user_id text,
  created_at text not null,
  updated_at text not null,
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (workspace_id) references workspaces(id) on delete set null,
  foreign key (created_by_user_id) references user(id) on delete set null
);
```

A board is the product view for planning and tracking work. A board may start
workspace-scoped. Cross-workspace boards should wait until workspace ownership,
authorization, and aggregate queries are stable.

## Team Work Items

```sql
create table team_work_items (
  id text primary key,
  team_id text not null,
  board_id text,
  workspace_id text not null,
  task_path text,
  title text not null,
  description text not null default '',
  state text not null,
  priority text not null default 'medium',
  labels_json text not null default '[]',
  assignee_user_id text,
  assignee_service_account_id text,
  eligible_agents_json text not null default '[]',
  allowed_paths_json text not null default '[]',
  required_evidence_json text not null default '[]',
  external_refs_json text not null default '[]',
  created_by_user_id text,
  published_at text,
  created_at text not null,
  updated_at text not null,
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (board_id) references team_boards(id) on delete set null,
  foreign key (workspace_id) references workspaces(id) on delete cascade,
  foreign key (assignee_user_id) references user(id) on delete set null,
  foreign key (assignee_service_account_id)
    references team_service_accounts(id)
    on delete set null,
  foreign key (created_by_user_id) references user(id) on delete set null
);
```

`team_work_items` indexes dashboard-authored work. Once a work item is
published to agents as portable HA2HA work, `task_path` should point at a
workspace task file and the current state should remain reconcilable from that
file.

`draft` is product-only. Published work should use HA2HA task states:
`ready`, `claimed`, `working`, `blocked`, `review`, `done`, and `abandoned`.

## Work Item Claims

```sql
create table team_work_item_claims (
  id text primary key,
  team_id text not null,
  work_item_id text not null,
  workspace_id text not null,
  actor_handle text,
  service_account_id text,
  user_id text,
  state text not null,
  claimed_at text not null,
  lease_expires_at text,
  released_at text,
  release_reason text,
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (work_item_id) references team_work_items(id) on delete cascade,
  foreign key (workspace_id) references workspaces(id) on delete cascade,
  foreign key (service_account_id)
    references team_service_accounts(id)
    on delete set null,
  foreign key (user_id) references user(id) on delete set null
);
```

Claims are product indexes over workspace task ownership. The versioned task
file update remains the durable collaboration record. Product claim rows make
agent inbox queries and board views efficient.

## Team Audit Events

```sql
create table team_audit_events (
  id text primary key,
  team_id text not null,
  workspace_id text,
  type text not null,
  actor_user_id text,
  actor_service_account_id text,
  actor_handle text,
  target_json text not null default '{}',
  payload_json text not null default '{}',
  created_at text not null,
  foreign key (team_id) references teams(id) on delete cascade,
  foreign key (workspace_id) references workspaces(id) on delete set null,
  foreign key (actor_user_id) references user(id) on delete set null,
  foreign key (actor_service_account_id)
    references team_service_accounts(id)
    on delete set null
);
```

Team audit events are append-oriented product records. Use them for
authority-bearing actions such as membership changes, service-account rotation,
integration changes, workspace import, workspace transfer, link rotation,
retention operations, exports, work-item publication, claims, releases,
reassignments, and sensitive control-panel actions.

Do not store raw tokens, credentials, private prompts, or oversized provider
logs in audit event payloads.

## Team Usage Rollups

Start with live aggregate queries. Add rollups only when needed.

```sql
create table team_usage_daily (
  team_id text not null,
  day text not null,
  workspace_count integer not null default 0,
  active_workspace_count integer not null default 0,
  file_count integer not null default 0,
  file_version_count integer not null default 0,
  storage_bytes integer not null default 0,
  protocol_event_count integer not null default 0,
  admin_event_count integer not null default 0,
  comment_count integer not null default 0,
  conflict_count integer not null default 0,
  created_at text not null,
  updated_at text not null,
  primary key (team_id, day),
  foreign key (team_id) references teams(id) on delete cascade
);
```

Rollups are projections. Canonical state remains in `workspaces`,
`workspace_files`, `workspace_file_versions`, `workspace_events`, `comments`,
`workspace_admin_events`, and team product tables.

## Query Boundaries

Team aggregate APIs should return product DTOs instead of leaking persistence
rows directly.

Recommended first outputs:

- team summary
- workspace inventory rows
- aggregate health issues
- recent team activity
- recent team audit events
- usage totals
- role and service-account status
- integration status
- board summary
- ready work item rows
- agent inbox rows
- claim and stale-lease status

## Indexes

Expected indexes:

```sql
create index teams_slug_idx on teams(slug);
create index team_members_user_idx on team_members(user_id);
create index workspaces_team_updated_idx on workspaces(team_id, updated_at);
create index team_audit_events_team_created_idx
  on team_audit_events(team_id, created_at);
create index team_service_accounts_team_idx
  on team_service_accounts(team_id);
create index team_integrations_team_provider_idx
  on team_integrations(team_id, provider);
create index team_boards_team_idx on team_boards(team_id);
create index team_work_items_team_state_idx
  on team_work_items(team_id, state);
create index team_work_items_workspace_task_idx
  on team_work_items(workspace_id, task_path);
create index team_work_item_claims_work_item_idx
  on team_work_item_claims(work_item_id);
```

Add more only after query plans or usage patterns justify them.
