# v0 Storage Strategy

## Decision

MDSync v0 uses one application D1 database and one R2 bucket:

```txt
Application D1 = control plane
R2 bucket = file-byte storage
```

This keeps the first implementation simple while avoiding arbitrary Markdown bodies in D1.

## Why R2 For Files

Markdown files, logs, generated reports, and future screenshots are unstructured file data. They belong in object storage.

R2 should store:

- Markdown file bodies.
- Larger logs and evidence files.
- Future binary artifacts, such as screenshots.

R2 should not be the canonical workspace tree. Object listing is an implementation detail, not the product index.

## Why D1 Still Matters

D1 stores the relational state that makes MDSync usable:

- workspace metadata
- capability and access settings
- file paths
- current file version
- current R2 object key
- content type
- size and hash
- updated timestamp and actor

D1 answers what exists and who can access it. R2 stores the bytes.

## Schema Shape

```sql
workspaces(
  id,
  title,
  read_access,
  write_access,
  read_token_hash,
  write_token_hash,
  r2_prefix,
  file_count,
  total_size_bytes,
  created_at,
  updated_at,
  last_accessed_at
);

workspace_files(
  workspace_id,
  path,
  object_key,
  content_type,
  size_bytes,
  sha256,
  version,
  updated_by,
  created_at,
  updated_at
);
```

## Object Key Shape

Use opaque R2 object keys:

```txt
workspaces/{workspace_id}/objects/{opaque_object_id}
```

Avoid using human file paths directly as R2 keys. Human paths can contain awkward characters, future renames are easier when object keys are opaque, and the D1 index stays authoritative.

## Write Flow

There is no atomic transaction across D1 and R2. The v0 write flow is:

```txt
1. Validate workspace write capability.
2. Normalize and validate the file path.
3. Upload new bytes to R2 under a fresh object key.
4. Conditionally update the D1 file row with baseVersion.
5. If D1 update succeeds, optionally delete the previous R2 object.
6. If D1 update fails, best-effort delete the newly uploaded R2 object and return 409.
```

## Read Flow

```txt
1. Validate workspace read capability in D1.
2. Look up the file path in D1.
3. Fetch the object key from R2.
4. Return bytes with version headers from D1.
```

Raw file responses should include:

```txt
ETag: "<version>"
X-HA2HA-File-Version: <version>
X-HA2HA-Path: <path>
```

## Explicitly Deferred

Per-workspace D1 is not a v0 storage target. Durable `workspace_file_versions`, `workspace_events`, comments, users, sessions, `file_locks`, and encryption also stay out of v0 storage scope.
