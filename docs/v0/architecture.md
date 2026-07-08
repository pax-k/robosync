# v0 Architecture

## Runtime

MDSync v0 is implemented by a web app and server app:

```txt
apps/web      # browser workspace UI
apps/server   # API, raw routes, D1 metadata, R2 file bytes
```

The deployed target may become one Worker that serves API routes, raw routes, and static web assets. The docs do not require that topology for v0 as long as the browser app and server app expose the documented behavior.

## Stack

- Runtime: Cloudflare Workers.
- API framework: Hono.
- Database: Cloudflare D1 for metadata and file indexes.
- Object storage: Cloudflare R2 for Markdown and future binary bytes.
- Frontend: React workspace browser/editor.
- Agent integration: MDSync upload and update scripts.

## Storage Architecture

D1 is the control plane. R2 is the data plane.

```txt
D1
├── workspace registry
├── capability/access settings
├── file path index
├── current file version
├── current R2 object key
├── size/hash/content type metadata
└── update actor and timestamps

R2
└── actual file bytes
```

D1 is the canonical workspace tree. R2 object listing is not a product index.

## Request Routing

The server should route in this order:

1. API routes under `/api/*`.
2. Raw agent routes under `/w/:workspaceId/raw*`.
3. Browser workspace routes under `/w/:workspaceId*`.
4. Static assets.
5. 404 for unknown API/raw routes.

## Browser App

The browser app owns the human experience:

```txt
left navigation: workspace folders and files
main panel: rendered Markdown or editor
top bar: workspace title, selected file, version, updated metadata
```

The browser app fetches workspace metadata and file content through JSON API routes. It should not parse raw listing text.

## Agent Interface

Agents should use raw routes and scripts:

```txt
GET /w/:workspaceId/raw
GET /w/:workspaceId/raw/:path
```

The raw interface stays stable, plain, and easy to inspect with `curl`.

## Permissions

Permissions are evaluated at the workspace level. Files inherit workspace permissions.

Capability tokens can be supplied by query parameter:

```txt
?k=<read_token>
?edit=<write_token>
```

For API writes, the write token can also be supplied with:

```txt
Authorization: Bearer <write_token>
```

The bearer header is preferred for scripts because it avoids copied edit-token URLs in many command paths. Query tokens remain useful for browser links.

## Concurrency

Every file has a `version` integer. Read responses include the current version. Write requests include `baseVersion`.

The v0 write pattern is:

```txt
put new object in R2
conditional update in D1
if D1 update fails, clean up new R2 object
```

If the current file version does not match `baseVersion`, the API returns `409 Conflict` with the latest content and version.

## Why Not Real-Time Collaboration

Real-time collaboration requires presence state, cursors, merge semantics, CRDTs or operational transforms, and identity. v0 only needs reliable asynchronous coordination through versioned files.
