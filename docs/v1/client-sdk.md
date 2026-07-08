# HA2HA Client SDK

## Status

Planned, not shipped.

No `@ha2ha/client` package exists yet. Current HA2HA implementation evidence is
repo-local: protocol constants, schemas, validators, examples, HTTP conformance
tooling, the HA2HA docs site, and the core HA2HA agent skill alpha.

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

The first useful `@ha2ha/client` should expose typed helpers for:

- validating a workspace
- reading a workspace listing
- reading a file and its target coordinate
- creating or updating a file with `actor` and `baseVersion`
- deleting a file with `actor` and `baseVersion`
- surfacing typed `version_conflict` results
- claiming a task through a v1 task-file update
- adding evidence with v1 metadata
- recording a decision file
- writing a handoff note without claiming v3 coordination semantics
- using local-folder and HTTP-profile transports

The client should return structured results rather than throwing untyped
provider or parser errors across package boundaries.

## Value

The client gives each adopter one typed way to integrate HA2HA:

- agent skills can call client methods instead of copying curl workflows
- MCP tools can wrap a stable protocol library
- internal harnesses can preserve `baseVersion`, actor, and evidence behavior
- desktop or local-first apps can use the same semantics as hosted HTTP
  implementations
- competing products can build against the protocol without reverse-engineering
  MDSync

## Not Shipped Until Proven

Do not market `@ha2ha/client` as shipped until:

- the package exists with release metadata and install docs
- public exports and types are stable enough for a v1 claim
- empty-project install smoke passes
- local-folder and HTTP-profile behavior have tests
- conformance or dogfood evidence proves the client against at least one
  deterministic implementation

Track implementation readiness in
[tasks/V1-012-ha2ha-client-sdk.md](tasks/V1-012-ha2ha-client-sdk.md).
