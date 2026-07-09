# Storage Evolution

## Current Baseline

v0 starts with one application D1 database and one R2 bucket.

V2 keeps this baseline. Import/export, comments, admin events, retention policy,
and cleanup are implemented on the existing app D1 plus R2 topology. There is no
current isolation or scale evidence that justifies provisioning one D1 database
per workspace.

## V2 Import Export And Retention

The current topology supports product durability without a storage split:

- export reads current file rows, file-version rows, HA2HA protocol events,
  product comments, product admin events, and corresponding R2 object contents
- import writes a new workspace into the same app D1, uploads new R2 objects,
  and assigns fresh capability links
- retention policy is exposed as product metadata to write-capability holders
- cleanup prunes selected old rows and explicit orphan object keys under the
  workspace R2 prefix

This proves the product behavior first. Per-workspace D1 remains a future
migration only if the simpler topology fails an isolation, export, or scale
requirement.

## Persistence Access Boundary

Application code should access D1 through the Drizzle-backed workspace storage
repository. The Drizzle schema in `@mdsync/db` remains the table authority for
workspace metadata, files, file versions, protocol events, comments, and admin
events.

Server route handlers should not call D1 `prepare` or `batch` directly. Raw SQL
is allowed only as a typed, localized Drizzle `sql` escape hatch inside storage
helpers when SQLite/D1-specific logic is clearer than the query builder, such as
retention anti-joins that protect current and comment-anchored file versions.
The script boundary tests enforce this rule for non-test workspace source.

## Per-Workspace D1

Per-workspace D1 is a later architecture option for stronger isolation, cleaner per-workspace export, or scale needs.

In Cloudflare terms, this means provisioning a separate D1 database resource for each workspace. It is not a free-form SQLite file created inside a request path.

Conceptual split:

```txt
Master D1 = app registry, routing, admin state
Workspace D1 = workspace-local file index, versions, events
R2 = actual file bytes
```

## Master D1 Stores

```sql
workspaces(
  id text primary key,
  title text,
  status text not null,
  d1_database_id text not null,
  d1_database_name text not null,
  d1_schema_version integer not null,
  r2_prefix text not null,
  read_access text not null,
  write_access text not null,
  read_token_hash text,
  write_token_hash text,
  file_count integer not null default 0,
  total_size_bytes integer not null default 0,
  created_at text not null,
  updated_at text not null,
  last_accessed_at text
);
```

The master database answers:

- Does this workspace exist?
- Is it provisioning, ready, deleted, or errored?
- Which workspace database owns its index?
- Which R2 prefix owns its objects?
- What access policy applies?
- Which schema version is the workspace database on?

## Workspace D1 Stores

```sql
workspace_meta(
  id text primary key,
  title text,
  schema_version integer not null,
  created_at text not null,
  updated_at text not null
);

files(
  path text primary key,
  current_object_key text not null,
  content_type text not null,
  size_bytes integer not null,
  sha256 text,
  version integer not null,
  updated_by text,
  created_at text not null,
  updated_at text not null
);
```

Protocol event and file-version records may also live in a workspace database when the v1 profiles are implemented.

## Why Not Earlier

Per-workspace D1 adds operational complexity:

- workspace provisioning
- schema migrations across many databases
- routing from master database to workspace database
- failure states when database creation or migration fails
- harder local development and smoke testing

MDSync should first prove the sharing, coordination, and conformance workflow with the simpler baseline.
