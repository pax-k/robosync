# HA2HA HTTP Profile

The HTTP profile defines deterministic routes and response semantics for HA2HA implementations.

## Required Routes

```txt
GET /w/:workspaceId/raw
GET /w/:workspaceId/raw/:path
GET /api/workspaces/:workspaceId/tree
GET /api/workspaces/:workspaceId/files?path=<path>
PUT /api/workspaces/:workspaceId/files
DELETE /api/workspaces/:workspaceId/files?path=<path>
```

Implementations may expose additional product routes, but HA2HA clients should be able to rely on the profile above.

## Raw Workspace Listing

```txt
GET /w/:workspaceId/raw
```

Response content type:

```txt
text/plain; charset=utf-8
```

The listing must include enough path information for an agent to choose which files to fetch next. Implementations may include title, update timestamp, and capability hints.

## Raw File

```txt
GET /w/:workspaceId/raw/:path
```

Required response headers:

```txt
Content-Type: text/markdown; charset=utf-8
ETag: "<file_version>"
X-HA2HA-File-Version: <file_version>
X-HA2HA-Path: <path>
```

Non-Markdown files may use their actual content type, but must still include version and path headers.

## File Updates

Updates must include:

- `path`
- `content` or implementation-defined bytes payload
- `baseVersion` for existing files
- actor/update metadata when the implementation supports it

If `baseVersion` does not match the latest version, the implementation must return `409 Conflict` with the latest version and enough content or metadata for intentional merge.

## Conflict Response

```json
{
  "error": "version_conflict",
  "message": "File changed since baseVersion.",
  "latest": {
    "path": "tasks/RS-001.md",
    "content": "...",
    "version": 18,
    "updatedAt": "2026-07-08T15:39:00.000Z",
    "updatedBy": "codex-agent-2"
  }
}
```

## Event Profile

Implementations that support events expose append-only workspace changes.

Suggested routes:

```txt
GET /api/workspaces/:workspaceId/events
GET /w/:workspaceId/raw/events
```

Events must be ordered, stable, and safe to poll. Events are protocol data; activity feeds, stats charts, and changelog UI are product features.

## File History Profile

Implementations that support file history expose durable file-version metadata and retrieval.

Suggested routes:

```txt
GET /api/workspaces/:workspaceId/files/versions?path=<path>
GET /api/workspaces/:workspaceId/files/versions/:version?path=<path>
```

File history is protocol data; diff/restore UI is product scope.

## Status Codes

- `200`: successful read or update.
- `201`: workspace created, when creation is supported by the implementation.
- `400`: invalid request.
- `401`: missing required credential or capability.
- `403`: credential or capability does not allow the requested action.
- `404`: workspace or file not found.
- `409`: file version conflict.
- `413`: request too large.
- `500`: unexpected server error.
