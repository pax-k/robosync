# HA2HA Protocol

HA2HA is the Human-Agent to Human-Agent Protocol.

It lets separate human-agent pairs coordinate through shared, versioned, inspectable workspaces. It is not an agent RPC protocol, an agent registry, a generic documentation platform, or real-time collaborative editing.

MDSync is the first implementation.

## Core Promise

```txt
my agent and your agent can synchronize by reading and writing the same inspectable workspace
```

## Relationship To A2A And MCP

A2A connects agents to other agents through a protocol for discovery, task exchange, messages, artifacts, streaming, and authentication.

MCP connects an agent to tools and resources.

HA2HA connects human-agent pairs through a shared workspace. It borrows coordination vocabulary from agent protocols, but exposes state as files and HTTP semantics that humans can inspect.

## Public Primitives

HA2HA defines these public primitives:

- workspace: the shared context
- participant: a human, agent, or human-agent pair active in the workspace
- task: a unit of work represented as a versioned file
- artifact: an output file
- evidence: proof, logs, screenshots, command output, or links for a task
- decision: an accepted choice or architecture record
- status: a compact human-readable dashboard
- event: an append-only record of a meaningful workspace change
- file version: a durable versioned representation of a workspace file

## Workspace Convention

The canonical workspace convention is:

```txt
HA2HA.md
STATUS.md
participants/<handle>.md
tasks/<id>.md
decisions/*.md
evidence/*
logs/*.md
.ha2ha/workspace.json
```

`HA2HA.md` is the human-readable workspace manifest.

`.ha2ha/workspace.json` is the machine-readable workspace manifest.

## Sync Semantics

Every file has a current version. Writes that update or delete an existing file must include the version the caller read.

If the current version does not match `baseVersion`, the implementation must return a conflict response with the latest version and enough data for the caller to merge intentionally.

Agents should retry at most once after a conflict. A second conflict should stop the workflow and surface the conflict to the human.

## Task Semantics

Task files live under `tasks/<id>.md` and use frontmatter when possible.

Required task states:

```txt
ready
claimed
working
blocked
review
done
abandoned
```

State transitions happen through versioned file updates. Smaller task files are preferred over one large task list because they reduce conflicts and keep ownership clear.

## HTTP Profile

The HA2HA HTTP profile defines deterministic raw routes, JSON file operations, version headers, and conflict semantics. See [http-profile.md](http-profile.md).

Raw file responses include:

```txt
ETag: "<file_version>"
X-HA2HA-File-Version: <file_version>
X-HA2HA-Path: <path>
```

## Event And History Profiles

v1 includes protocol-level event and file-history capabilities:

- `workspace_events`: append-only records for meaningful workspace changes.
- `workspace_file_versions`: durable file-version records for history, diff, restore, audit, and conformance.

Product UIs such as changelogs, stats dashboards, diff viewers, and restore buttons are not protocol features. They belong to product scope.

## Product Boundary

HA2HA owns:

- protocol vocabulary
- canonical workspace filenames
- task states and frontmatter shape
- manifest shape
- file version and conflict semantics
- event/history protocol profiles
- HTTP profile requirements
- header names
- examples, schemas, validators, and conformance tests

MDSync owns:

- hosted product UX
- public product landing page
- browser editor and preview
- upload/update scripts
- product auth, retention, cleanup, deployment, and product-specific storage

## Naming

Canonical HA2HA names:

- `HA2HA.md`
- `.ha2ha/workspace.json`
- `X-HA2HA-File-Version`
- `X-HA2HA-Path`

Pre-public legacy names are not preserved as protocol aliases.

## Enforcement

The protocol becomes enforceable through:

- JSON schema for `.ha2ha/workspace.json`
- frontmatter schema for `tasks/<id>.md`
- event and file-version schemas
- valid and invalid example workspaces
- validator CLI or package API
- HTTP conformance checks against a running implementation
- docs site under `apps/ha2ha`

Until these exist, protocol docs are guidance rather than an enforceable standard.
