# Product Data Model

v2 product tables are separate from v1 protocol obligations.

## Comments

```sql
create table comments (
  id text primary key,
  workspace_id text not null,
  path text not null,
  version integer not null,
  anchor_json text not null default '{}',
  body text not null,
  author_id text,
  created_at text not null,
  updated_at text not null,
  resolved_at text,
  resolved_by text,
  foreign key (workspace_id, path, version)
    references workspace_file_versions(workspace_id, path, version)
    on delete cascade
);
```

Comments are anchored to versioned files so discussion does not drift silently when files change.
Resolution is product state, not HA2HA protocol state.

## Users

```sql
create table users (
  id text primary key,
  email text,
  display_name text,
  created_at text not null,
  updated_at text not null
);
```

Users should be added only when capability links are insufficient for product needs.

## Sessions

```sql
create table sessions (
  id text primary key,
  user_id text not null,
  expires_at text not null,
  created_at text not null
);
```

Session mechanics are product identity scope, not HA2HA protocol scope.

## File Locks

```sql
create table file_locks (
  workspace_id text not null,
  path text not null,
  owner_id text not null,
  expires_at text not null,
  created_at text not null,
  primary key (workspace_id, path)
);
```

`file_locks` should be introduced only if optimistic concurrency and one-task-per-file workflows do not cover real collaboration cases.

## Product Events

MDSync may keep product-only admin or billing events separately from HA2HA protocol events. Product-only events must not be required for HA2HA conformance.

```sql
create table workspace_admin_events (
  id text primary key,
  workspace_id text not null,
  type text not null,
  path text,
  actor text,
  payload text not null default '{}',
  created_at text not null,
  foreign key (workspace_id)
    references workspaces(id)
    on delete cascade
);
```

`workspace_admin_events` stores operational product state such as stale-write
conflicts or future cleanup failures. These rows are not returned by the HA2HA
v1 `workspace_events` routes and are not required for protocol conformance.

The V2 admin stats API aggregates `workspaces`, current files, file versions,
HA2HA protocol events, comments, task files, and `workspace_admin_events`.
Until product identity exists, admin stats are limited to callers with workspace
write capability.

## Workspace Export Bundle

V2 adds a product export bundle with format
`mdsync.workspace-export.v1`. It is not a HA2HA protocol record shape.

The bundle includes:

- source workspace metadata without capability token hashes
- current files with path, content type, content, version, actor, and timestamps
- file-version rows with historical contents
- HA2HA `workspace_events` serialized as product export data
- product `comments`
- product `workspace_admin_events`
- retention-policy metadata

The import route creates a new workspace ID, new R2 object keys, and fresh
capability links. It preserves product data values such as paths, versions,
actors, timestamps, event payloads, comment anchors, and admin-event payloads,
but it does not preserve source row IDs, source R2 object keys, raw tokens, or
token hashes.

## Retention Operations

V2 retention remains manual. `GET /api/workspaces/:workspaceId/retention`
returns coverage and storage-evolution status to write-capability holders.

`POST /api/workspaces/:workspaceId/retention/prune` accepts an explicit cutoff
and inclusion set. It can prune:

- HA2HA protocol events older than the cutoff
- resolved comments older than the cutoff
- product admin events older than the cutoff
- old file-version rows older than the cutoff, excluding current versions and
  comment-anchored versions
- explicit orphan object keys under the workspace R2 prefix

The prune route does not discover arbitrary R2 keys. Operators must provide
explicit object keys, and keys outside the workspace prefix are skipped.
