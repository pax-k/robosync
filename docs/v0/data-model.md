# v0 Data Model

## Tables

```sql
create table workspaces (
  id text primary key,
  title text,
  read_access text not null check (read_access in ('public', 'token')),
  write_access text not null check (write_access in ('none', 'public', 'token')),
  read_token_hash text,
  write_token_hash text,
  r2_prefix text not null,
  file_count integer not null default 0,
  total_size_bytes integer not null default 0,
  created_at text not null,
  updated_at text not null,
  last_accessed_at text
);

create table workspace_files (
  workspace_id text not null,
  path text not null,
  object_key text not null,
  content_type text not null default 'text/markdown',
  size_bytes integer not null,
  sha256 text,
  version integer not null default 1,
  updated_by text,
  created_at text not null,
  updated_at text not null,
  primary key (workspace_id, path),
  foreign key (workspace_id) references workspaces(id) on delete cascade
);

create index idx_workspace_files_workspace_path
on workspace_files(workspace_id, path);
```

## Storage Split

D1 stores metadata, access state, path indexes, and current versions. R2 stores file bytes.

Do not store Markdown file content in D1 for v0. D1 should only point at the current R2 object for each file.

Example R2 key shape:

```txt
workspaces/{workspace_id}/objects/{opaque_object_id}
```

Prefer opaque object IDs instead of human paths in R2. Human paths belong in D1.

## Workspace IDs

Workspace IDs should be short, URL-safe, and random rather than sequential.

The implementation can use `crypto.getRandomValues` in the Worker runtime.

## Capability Tokens

Read and write tokens should be random URL-safe values.

Rules:

- `read_token_hash` is required when `read_access = 'token'`.
- `read_token_hash` is null when `read_access = 'public'`.
- `write_token_hash` is required when `write_access = 'token'`.
- `write_token_hash` is null when `write_access` is `none` or `public`.

Store token hashes in D1, not raw capability tokens.

## Path Rules

Stored file paths must be normalized before writing.

Allowed:

```txt
README.md
TODO.md
STATUS.md
tasks/RS-001.md
evidence/test-output.md
```

Rejected:

```txt
/README.md
../secret.md
participants/../../secret.md
folder/
folder//file.md
```

V0 stores files only. Directories are inferred.

## Optimistic Update

All file updates should use a conditional SQL update after uploading the new content to R2.

```sql
update workspace_files
set
  object_key = ?,
  content_type = ?,
  size_bytes = ?,
  sha256 = ?,
  version = version + 1,
  updated_by = ?,
  updated_at = ?
where
  workspace_id = ?
  and path = ?
  and version = ?;
```

If the update affects zero rows, the API should fetch the latest row, return `409 Conflict`, and best-effort delete the newly uploaded R2 object.

## Creating New Files

For new files, the API can accept `baseVersion: null` or omit `baseVersion`.

If the path already exists and no `baseVersion` is provided, return `400 missing_base_version` rather than overwriting. If a provided `baseVersion` is stale, return `409 Conflict` with the latest file data.

For a new file, upload to R2 first, then insert the D1 row. If the insert fails because the path already exists, delete the newly uploaded object.

## Deleting Files

Deletes are conditional and require the `baseVersion` the caller read.

```sql
delete from workspace_files
where workspace_id = ? and path = ? and version = ?;
```

If no row is deleted because the version changed, return `409 Conflict`.

When a delete succeeds, delete the referenced R2 object after the D1 delete. If R2 cleanup fails, v0 can log the failure for later cleanup work.

## Explicitly Deferred

Do not add these in v0 unless the release scope is intentionally changed:

- `workspace_events`
- `workspace_file_versions`
- comments
- users
- sessions
- `file_locks`
- per-workspace D1
- encryption

The MVP should prove the workspace and optimistic concurrency model first.
