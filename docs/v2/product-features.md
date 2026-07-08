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

## Admin Surfaces

Admin features can include:

- workspace health
- storage usage
- failed cleanup jobs
- orphaned object cleanup
- retention policy status
- token revocation status

## Import And Export

Import/export should preserve paths, manifests, task files, evidence, decisions, logs, events, and file history where available.
