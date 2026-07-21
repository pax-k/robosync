# HTTP Workflows

Use HTTP mode only against a conformant HA2HA implementation.

Read routes:

```txt
GET /w/:workspaceId/raw
GET /w/:workspaceId/raw/:path
GET /api/workspaces/:workspaceId/tree
GET /api/workspaces/:workspaceId/files?path=<path>
```

Mutation routes:

```txt
PUT /api/workspaces/:workspaceId/files
DELETE /api/workspaces/:workspaceId/files?path=<path>
```

For writes, send `actor`, `path`, `content`, `contentType`, and `baseVersion`
when the file already exists. For deletes, send `actor` and `baseVersion`.

On `409 version_conflict`, read `latest.workspaceId`, `latest.path`, and
`latest.version`, merge once, and retry once with the latest version. On a
second conflict, stop and report the target coordinate to the human.

Credentials are implementation-specific. Treat write tokens, bearer tokens, or
identity session material as secrets and keep them out of evidence.
