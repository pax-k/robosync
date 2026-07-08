# v0 API Contract

This is the concrete MDSync v0 API. It is implementation authority for the demo/reference app, not the full HA2HA protocol.

## URL Shape

Human workspace:

```txt
GET /w/:workspaceId
GET /w/:workspaceId/:path
```

Agent raw workspace:

```txt
GET /w/:workspaceId/raw
GET /w/:workspaceId/raw/:path
```

JSON API:

```txt
POST   /api/workspaces
GET    /api/workspaces/:workspaceId
GET    /api/workspaces/:workspaceId/tree
GET    /api/workspaces/:workspaceId/files
PUT    /api/workspaces/:workspaceId/files
DELETE /api/workspaces/:workspaceId/files
```

## Create Workspace

```txt
POST /api/workspaces
Content-Type: application/json
```

Request:

```json
{
  "title": "Sprint evidence",
  "readAccess": "token",
  "writeAccess": "token",
  "files": [
    {
      "path": "README.md",
      "content": "# Sprint evidence\n"
    },
    {
      "path": "evidence/test-output.md",
      "content": "Tests passed.\n"
    }
  ]
}
```

Response:

```json
{
  "id": "abc123",
  "title": "Sprint evidence",
  "workspaceUrl": "https://mdsync.dev/w/abc123?k=read_token",
  "rawUrl": "https://mdsync.dev/w/abc123/raw?k=read_token",
  "editUrl": "https://mdsync.dev/w/abc123?edit=write_token",
  "createdAt": "2026-07-08T15:30:00.000Z"
}
```

## Get Workspace Metadata

```txt
GET /api/workspaces/:workspaceId
```

Response:

```json
{
  "id": "abc123",
  "title": "Sprint evidence",
  "readAccess": "token",
  "writeAccess": "token",
  "createdAt": "2026-07-08T15:30:00.000Z",
  "updatedAt": "2026-07-08T15:35:00.000Z"
}
```

The response must not include raw capability tokens.

## Get Tree

```txt
GET /api/workspaces/:workspaceId/tree
```

Response:

```json
{
  "workspaceId": "abc123",
  "files": [
    {
      "path": "README.md",
      "version": 1,
      "contentType": "text/markdown",
      "updatedAt": "2026-07-08T15:30:00.000Z",
      "updatedBy": "codex"
    }
  ]
}
```

The frontend can infer folders from file paths.

## Get File

```txt
GET /api/workspaces/:workspaceId/files?path=TODO.md
```

Response:

```json
{
  "workspaceId": "abc123",
  "path": "TODO.md",
  "content": "- [ ] Build API\n",
  "contentType": "text/markdown",
  "version": 17,
  "updatedAt": "2026-07-08T15:35:00.000Z",
  "updatedBy": "codex-agent-1"
}
```

## Upsert File

```txt
PUT /api/workspaces/:workspaceId/files
Content-Type: application/json
Authorization: Bearer <write_token>
```

Request:

```json
{
  "path": "TODO.md",
  "content": "- [x] Build API\n",
  "baseVersion": 17,
  "actor": "codex-agent-1"
}
```

Successful response:

```json
{
  "workspaceId": "abc123",
  "path": "TODO.md",
  "version": 18,
  "updatedAt": "2026-07-08T15:40:00.000Z",
  "updatedBy": "codex-agent-1"
}
```

Conflict response:

```txt
409 Conflict
```

```json
{
  "error": "version_conflict",
  "message": "File changed since baseVersion.",
  "latest": {
    "workspaceId": "abc123",
    "path": "TODO.md",
    "contentType": "text/markdown; charset=utf-8",
    "content": "- [ ] Build API\n- [ ] Add docs\n",
    "version": 18,
    "updatedAt": "2026-07-08T15:39:00.000Z",
    "updatedBy": "codex-agent-2"
  }
}
```

## Delete File

```txt
DELETE /api/workspaces/:workspaceId/files?path=TODO.md
Authorization: Bearer <write_token>
```

Required JSON body:

```json
{
  "baseVersion": 18,
  "actor": "codex-agent-1"
}
```

Deletes honor optimistic concurrency and require the version the caller read.

Successful response:

```json
{
  "workspaceId": "abc123",
  "path": "TODO.md",
  "deleted": true,
  "deletedBy": "codex-agent-1"
}
```

## Raw Workspace Listing

```txt
GET /w/:workspaceId/raw
```

Response content type:

```txt
text/plain; charset=utf-8
```

Response body:

```txt
# ha2ha workspace: abc123
title: Sprint evidence
updated_at: 2026-07-08T15:35:00.000Z

README.md
STATUS.md
tasks/RS-001.md
evidence/test-output.md
```

## Raw File

```txt
GET /w/:workspaceId/raw/tasks/RS-001.md
```

Response headers:

```txt
Content-Type: text/markdown; charset=utf-8
ETag: "17"
X-HA2HA-File-Version: 17
X-HA2HA-Path: tasks/RS-001.md
```

## Status Codes

- `200`: successful read or update.
- `201`: workspace created.
- `400`: invalid request.
- `401`: missing token for token-protected workspace.
- `403`: token present but does not allow the requested action.
- `404`: workspace or file not found.
- `409`: file version conflict.
- `413`: request too large, once size limits are enforced.
- `500`: unexpected server error.
