# Schemas And Validation

HA2HA v1 needs schemas and examples before it becomes an enforceable protocol.

## Required Schemas

- `.ha2ha/workspace.json`
- `tasks/<id>.md` frontmatter
- `participants/<handle>.md` frontmatter
- evidence frontmatter
- versioned target coordinates
- workspace event records
- workspace file-version records
- HTTP conflict responses
- raw listing metadata, if the raw listing grows beyond plain paths

## Workspace Manifest Shape

Draft fields:

```json
{
  "protocol": "ha2ha",
  "protocolVersion": "1.0.0",
  "workspaceId": "abc123",
  "title": "Sprint evidence",
  "paths": {
    "status": "STATUS.md",
    "participants": "participants/",
    "tasks": "tasks/",
    "evidence": "evidence/",
    "decisions": "decisions/",
    "logs": "logs/"
  },
  "capabilities": ["raw-read", "file-write", "events", "file-history"],
  "routes": {
    "rawListing": "/w/abc123/raw",
    "rawFile": "/w/abc123/raw/{path}"
  },
  "conflictPolicy": "baseVersion-required"
}
```

## Task Frontmatter Shape

Draft fields:

```yaml
id: RS-001
title: Implement raw workspace listing
state: ready
owner: null
updated_by: codex-pax
evidence:
  - evidence/RS-001/api-smoke.md
```

Validation requirements:

- `id` is required and should match the path identity.
- `title` is required.
- `state` must be one of the HA2HA task states.
- `owner` may be null.
- `updated_by` is required after the first mutating task update.
- `evidence` must be a list of workspace paths when present.

Minimal claim validation:

- A claim is a versioned update that sets `state`, `owner`, and `updated_by`.
- A task can be claimed only when `owner` is null or already equals the actor.
- Leases, handoffs, blockers, approvals, and stale-claim recovery are outside
  v1 core schema scope.

## Target Coordinate Shape

Draft fields:

```json
{
  "workspaceId": "abc123",
  "path": "tasks/RS-001.md",
  "version": 18
}
```

Validation requirements:

- `workspaceId` is required.
- `path` is required and must be a normalized workspace path.
- `version` is required and must be a positive integer.
- Optional selectors are not part of v1 core.

## Evidence Frontmatter Shape

Draft fields:

```yaml
id: ev-RS-001-api-smoke
task: RS-001
target:
  workspaceId: abc123
  path: tasks/RS-001.md
  version: 18
kind: command
result: pass
actor: codex-pax
created_at: 2026-07-08T12:20:00Z
```

Validation requirements:

- `id`, `kind`, `result`, `actor`, and `created_at` are required.
- Evidence must include `task`, `target`, or both.
- `target`, when present, must match the v1 target coordinate shape.
- Result values should be narrow enough for validators to distinguish pass,
  fail, skipped, blocked, and unknown outcomes.
- Environment, hashes, review, approval, and required-check semantics are v3
  profile scope.

## Event Record Shape

Draft fields:

```json
{
  "id": "evt_01",
  "workspaceId": "abc123",
  "type": "file.updated",
  "path": "tasks/RS-001.md",
  "version": 18,
  "actor": "codex-agent-1",
  "createdAt": "2026-07-08T15:40:00.000Z",
  "payload": {}
}
```

## File Version Shape

Draft fields:

```json
{
  "workspaceId": "abc123",
  "path": "tasks/RS-001.md",
  "version": 18,
  "contentType": "text/markdown",
  "sizeBytes": 512,
  "sha256": "hex",
  "updatedBy": "codex-agent-1",
  "createdAt": "2026-07-08T15:40:00.000Z"
}
```

## Conflict Response Shape

Draft fields:

```json
{
  "error": "version_conflict",
  "message": "File changed since baseVersion.",
  "latest": {
    "workspaceId": "abc123",
    "path": "tasks/RS-001.md",
    "contentType": "text/markdown; charset=utf-8",
    "content": "...",
    "version": 18,
    "updatedAt": "2026-07-08T15:39:00.000Z",
    "updatedBy": "codex-agent-2"
  }
}
```

`latest.workspaceId`, `latest.path`, and `latest.version` form the versioned
target coordinate.

## Example Workspaces

The protocol package should include:

- minimal valid workspace
- multi-participant task workspace
- valid event/history workspace
- invalid missing manifest
- invalid task state
- invalid evidence path
- invalid evidence metadata
- invalid target coordinate
- invalid conflict response

## Import, Export, And Snapshot Preservation

If an implementation offers import, export, or snapshot compatibility, schemas
and examples should prove that v1 data is preserved:

- canonical paths and exact file contents
- `HA2HA.md`
- `.ha2ha/workspace.json`
- participants, tasks, evidence, decisions, status, and logs
- event and file-history records for claimed profiles

Archive format, retention, backup, admin export, and storage topology are not
v1 schema requirements.

## Validator Requirements

The validator must report structured errors with:

- path
- rule id
- severity
- message
- suggested repair when obvious

Markdown guidance is not enough for protocol enforcement. The schemas, validator, examples, and conformance checks are the enforcement surfaces.
