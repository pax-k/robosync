# HA2HA Client SDK

## Status

Shipped as a tarball-installable v1 protocol package.

`@ha2ha/client` lives in `packages/ha2ha-client`. It is registry-ready but not
published to npm by default. Current install evidence uses `npm pack` tarballs
and empty-project smoke tests.

## Purpose

`@ha2ha/client` should make HA2HA easy to integrate from apps, CLIs, skills,
agents, MCP tools, internal harnesses, desktop apps, and competing
implementations without reimplementing raw HTTP or file semantics.

The client is the typed portable integration surface over the HA2HA protocol.
It should help adopters read and write HA2HA workspaces correctly while keeping
the protocol authority in workspace files, schemas, validators, examples, and
conformance evidence.

## Boundary

The HA2HA client may depend on `@ha2ha/protocol`.

It must not depend on:

- MDSync auth
- MDSync dashboards or browser UX
- MDSync comments, stats, admin, or product read models
- MDSync database, storage, deployment, or UI packages
- MDSync provider sync or hosted-only routes

MDSync can use the HA2HA client. The HA2HA client must not use the MDSync
client.

## Minimum Capabilities

The first `@ha2ha/client` exposes typed helpers for:

- `createHa2haClient({ actor, transport, clock? })`
- `createHttpTransport({ baseUrl, workspaceId, fetch?, authorizeRequest? })`
- `createLocalFolderTransport({ rootDir, workspaceId? })`
- `validateWorkspace`
- `listWorkspace`
- `readFile`
- `writeFile`
- `deleteFile`
- `claimTask`
- `addEvidence`
- `recordDecision`
- `writeHandoff`

The client should return structured results rather than throwing untyped
provider or parser errors across package boundaries.

Results use `{ ok: true, data }` or `{ ok: false, error }`. Typed
`version_conflict` errors expose `latest.workspaceId`, `latest.path`, and
`latest.version`.

The local-folder transport uses `.ha2ha/file-versions.json` and
`.ha2ha/workspace-events.json` as its version and event stores. It does not keep
a private client cache.

## Value

The client gives each adopter one typed way to integrate HA2HA:

- agent skills can call client methods instead of copying curl workflows
- MCP tools can wrap a stable protocol library
- internal harnesses can preserve `baseVersion`, actor, and evidence behavior
- desktop or local-first apps can use the same semantics as hosted HTTP
  implementations
- competing products can build against the protocol without reverse-engineering
  MDSync

## Shipped Evidence

`@ha2ha/client` is a shipped v1 protocol package when these checks pass:

- package metadata and install docs exist
- public exports and types point at built `dist` artifacts
- empty-project install smoke passes
- local-folder and HTTP-profile behavior have tests
- dogfood evidence proves the client against a deterministic HTTP server and a
  local HA2HA folder

Track implementation readiness in
[tasks/V1-012-ha2ha-client-sdk.md](tasks/V1-012-ha2ha-client-sdk.md).
