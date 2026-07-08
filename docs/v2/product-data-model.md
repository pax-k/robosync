# Product Data Model

v2 product tables are separate from v1 protocol obligations.

## Comments

```sql
create table comments (
  id text primary key,
  workspace_id text not null,
  path text not null,
  version integer,
  anchor_json text,
  body text not null,
  author_id text,
  created_at text not null,
  updated_at text not null
);
```

Comments are anchored to versioned files so discussion does not drift silently when files change.

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
