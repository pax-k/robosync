# v0: Foundation And Demo Implementation

v0 is the first shippable MDSync implementation. It proves the substrate for human and agent sharing: workspaces, Markdown files, raw routes, capability links, optimistic concurrency, a browser workspace UI, upload/update scripts, and backend smoke checks.

v0 is not full HA2HA protocol conformance. It may use HA2HA-compatible names where they are already needed, but validators, conformance suites, event/history profiles, and full protocol packaging belong to v1.

## In Scope

- One MDSync workspace model for single-file and multi-file sharing.
- Demo browser workspace under `apps/web`.
- Server API under `apps/server`.
- D1 metadata/index storage and R2 file-byte storage.
- Capability links for read and edit access.
- Raw workspace and raw file routes for agents.
- JSON API for the browser/editor.
- Per-file versions and `baseVersion` conflict handling.
- Upload and update scripts.
- Backend smoke checks.

## Out Of Scope

The v0 docs may name these only as explicit exclusions:

- `workspace_events`
- `workspace_file_versions`
- comments
- users
- sessions
- `file_locks`
- per-workspace D1
- encryption
- protocol validators
- conformance suites

## Files

- [sprint.md](sprint.md)
- [tasks/](tasks/)
- [product-scope.md](product-scope.md)
- [architecture.md](architecture.md)
- [implementation-plan.md](implementation-plan.md)
- [api-contract.md](api-contract.md)
- [data-model.md](data-model.md)
- [storage-strategy.md](storage-strategy.md)
- [agent-skill-and-scripts.md](agent-skill-and-scripts.md)
- [backend-smoke.md](backend-smoke.md)
