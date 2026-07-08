# Schemas And Validation

HA2HA v1 needs schemas and examples before it becomes an enforceable protocol.

## Required Schemas

- `.ha2ha/workspace.json`
- `tasks/<id>.md` frontmatter
- `participants/<handle>.md` frontmatter
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
- `evidence` must be a list of workspace paths when present.

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

## Example Workspaces

The protocol package should include:

- minimal valid workspace
- multi-participant task workspace
- valid event/history workspace
- invalid missing manifest
- invalid task state
- invalid evidence path
- invalid conflict response

## Validator Requirements

The validator must report structured errors with:

- path
- rule id
- severity
- message
- suggested repair when obvious

Markdown guidance is not enough for protocol enforcement. The schemas, validator, examples, and conformance checks are the enforcement surfaces.
