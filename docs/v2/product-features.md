# Product Features

## Stats Dashboard

Show useful workspace activity without turning stats into protocol behavior:

- file count
- total size
- recent updates
- active participants when identity exists
- task counts by state
- conflict counts
- stale workspaces

## Changelog UI

Render protocol events as a human-friendly activity feed.

Product UI can group, filter, and summarize events. The underlying event record remains protocol data.

## File History UI

Show file versions for a selected path:

- version number
- updated timestamp
- actor
- size/hash
- preview
- links to related events

## Diff And Restore

Diff and restore are product workflows over versioned files. Restore should create a new file version rather than mutating old history.

## Comments

Comments are product data, not HA2HA v1 protocol. Anchor comments to:

- `workspace_id`
- `path`
- `version`
- optional line or heading selector

Comments are not real-time chat in this roadmap.
Resolving comments is product review state, not protocol conformance state.

## Admin Surfaces

Admin features can include:

- workspace health
- storage usage
- failed cleanup jobs
- orphaned object cleanup
- retention policy status
- token revocation status

The V2 admin surface summarizes current files, immutable file versions, HA2HA
protocol events, task state, comments, conflicts, storage, cleanup, and
retention state. Conflict counts and cleanup failures are product admin state,
not HA2HA protocol events. Until identity and sessions exist, admin visibility
is limited to workspace write-capability holders.

## Import And Export

Import/export preserves the current product workspace shape:

- current file paths and file contents
- canonical protocol paths such as `.ha2ha/workspace.json`
- task files, evidence files, decisions, and logs when they are stored as
  workspace files
- HA2HA protocol events
- file-version history with historical contents
- product comments and version-aware anchors
- product admin events such as stale-write conflicts

Exports are write-capability gated because they include the full workspace
contents and product review state. Export bundles omit raw capability tokens and
token hashes. Import creates a new token-protected workspace with fresh
capabilities rather than copying source access material.

## Retention And Cleanup

Retention is product policy, not HA2HA protocol conformance. V2 exposes a manual
retention policy route and an operator prune route covering protocol events,
resolved comments, admin logs, old file-version rows, and explicit scoped R2
object cleanup. Product UI exposes export/import controls and retention-policy
visibility; destructive pruning remains an operator route.
