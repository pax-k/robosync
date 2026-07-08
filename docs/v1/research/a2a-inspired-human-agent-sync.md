# A2A-Inspired HA2HA Research

Research date: 2026-07-08

This document is non-normative research. It informs the v1 protocol direction, but [../ha2ha-protocol.md](../ha2ha-protocol.md), [../workspace-conventions.md](../workspace-conventions.md), [../http-profile.md](../http-profile.md), and [../conformance.md](../conformance.md) are the protocol authority.

## Product Question

HA2HA is inspired by Agent2Agent (A2A), but the immediate pain is different:

- A user has an agent working in their local/chat/repo context.
- A teammate has another agent working in a separate context.
- The agents need a shared, inspectable place to synchronize tasks, status, decisions, evidence, and documentation.
- Humans still need to read, edit, and share the same workspace without using an agent-only protocol.

That makes HA2HA closer to a human-agent-to-human-agent workspace protocol than a generic agent-to-agent runtime protocol.

## Reconciled Final Form

The A2A-inspired direction is now HA2HA: Human-Agent to Human-Agent Protocol.

MDSync is the first product implementation of HA2HA.

Final product shape:

```txt
HA2HA = shared Markdown workspace protocol
       + human-readable coordination conventions
       + file version and conflict semantics
       + optional event/version/comment/security profiles
```

MDSync v0 remains the first implementation:

```txt
workspace link
raw routes
JSON file/tree API
capability links
R2 file bytes
D1 metadata/index
per-file versions
baseVersion conflict handling
browser preview/edit
upload/update scripts
```

The A2A-inspired layer becomes a workspace convention pack:

```txt
HA2HA.md
STATUS.md
participants/<handle>.md
tasks/<id>.md
decisions/*.md
evidence/*
logs/*.md
optional .ha2ha/workspace.json later
```

The protocol should be framed as:

```txt
Human-Agent to Human-Agent Protocol for shared, versioned, inspectable workspaces.
```

It should not be framed as an A2A replacement, a full docs platform, or real-time collaboration. The durable promise is that separate humans and agents can coordinate through the same versioned, inspectable files.

The only HA2HA pieces pulled into MDSync v0 are documentation, templates, and agent skill behavior: recommend `HA2HA.md`, prefer `tasks/<id>.md`, and teach agents to read `HA2HA.md`, `STATUS.md`, and relevant task files before editing.

Post-v0 should add coordination power in this order:

1. `workspace_events`: changelog, activity feed, lightweight stats, and debugging evidence.
2. `workspace_file_versions`: durable file history, diff, and restore.
3. Better sync ergonomics: append-only logs, raw events, optional regenerated `STATUS.md`.
4. Comments anchored to `workspaceId`, `path`, and `version`.
5. Security maturity: token rotation, token revocation, signed manifests, optional identity.
6. Encryption after choosing the key ownership model.

Encryption remains a separate security-design decision. Server-managed encryption preserves browser preview and raw plaintext routes. Client-side or end-to-end encryption changes preview, search, comments, and agent-read behavior because an implementation cannot inspect plaintext without the key.

## What A2A Standardizes

A2A is an open protocol for interoperability between independent, often opaque, agentic applications. The official project describes the core goals as letting agents discover each other's capabilities, negotiate modalities, collaborate on long-running tasks, and operate without exposing internal state, memory, or tools.

The current A2A surface is built around these primitives:

- `AgentCard`: a JSON self-description for an agent, including identity, endpoint, capabilities, authentication requirements, and skills.
- Discovery: commonly through a well-known URL such as `/.well-known/agent-card.json`.
- Messages: request/response exchanges containing text, files, or structured data parts.
- Tasks: stateful, trackable work created when an interaction needs longer-running coordination.
- `contextId`: groups related messages and tasks into a shared interaction context.
- Artifacts: outputs produced by a task.
- Updates: synchronous responses, streaming with Server-Sent Events, and asynchronous push notification mechanisms.
- Transports: JSON-RPC over HTTP(S), with additional gRPC and HTTP+JSON/REST bindings in the specification.
- Security: bearer/OAuth-style schemes, mTLS, signed agent cards, and server-side authorization responsibilities.

A2A is distinct from MCP. MCP connects an agent to tools and resources. A2A connects agents to other agents for higher-level, stateful collaboration.

## Relevant Sources

- A2A project README: https://github.com/a2aproject/A2A
- A2A specification: https://a2a-protocol.org/latest/specification/
- Agent discovery and Agent Cards: https://a2a-protocol.org/latest/topics/agent-discovery/
- Life of a task and `contextId`: https://a2a-protocol.org/latest/topics/life-of-a-task/
- A2A and MCP comparison: https://a2a-protocol.org/latest/topics/a2a-and-mcp/
- Linux Foundation adoption note, 2026-04-09: https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year
- Gemini Enterprise custom A2A registration example: https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-a2a-agent

## What HA2HA Should Borrow

HA2HA should borrow A2A's coordination ideas, not its whole runtime shape.

### 1. Discovery Becomes Workspace Discovery

A2A uses an `AgentCard` to describe an agent. HA2HA should use a workspace manifest to describe a shared coordination space.

Candidate file:

```txt
HA2HA.md
```

Optional structured companion:

```txt
.ha2ha/workspace.json
```

The manifest should answer:

- What is this workspace for?
- Which files are authoritative?
- Which participants or agents are active?
- Which task/status conventions are used?
- Which routes are stable for agents?
- How should conflicts be handled?

This is more useful than publishing each human's agent as an always-online A2A server.

### 2. Skills Become Workspace Capabilities

A2A exposes agent skills. HA2HA can expose workspace capabilities:

- `doc-publish`: publish Markdown and return human/raw links.
- `task-sync`: coordinate task ownership and status.
- `status-sync`: publish current state, blockers, and next actions.
- `evidence-drop`: attach verification output, screenshots, logs, or links.
- `decision-log`: record accepted decisions.

These capabilities describe what the workspace supports, not what any single opaque agent can do.

### 3. Tasks Become Versioned Task Files

A2A tasks are protocol objects. In HA2HA, the simplest durable task object is a Markdown file with structured frontmatter.

Prefer one task per file:

```txt
tasks/RS-001.md
tasks/RS-002.md
tasks/RS-003.md
```

Example:

```md
---
id: RS-001
title: Implement raw workspace listing
state: ready
owner: null
updated_by: codex-pax
evidence:
  - evidence/RS-001-api-smoke.md
---

## Goal

Return a deterministic raw listing for agent clients.

## Notes

- Preserve path ordering.
- Include enough metadata for agents to decide what to fetch next.
```

This reduces write conflicts compared with one large shared `TODO.md`.

### 4. `contextId` Becomes Workspace And Thread Context

A2A uses `contextId` to group related messages and tasks. HA2HA already has the right primary grouping object: `workspaceId`.

For human-agent sync:

- `workspaceId` groups the shared collaboration context.
- `tasks/<id>.md` identifies a unit of work.
- `participants/<handle>.md` identifies an agent/human participant.
- `evidence/<task-id>/*` groups proof for a task.

This keeps the shared context visible as files rather than hidden inside an agent session.

### 5. Artifacts Become Workspace Files

A2A artifacts map naturally to HA2HA files:

- Reports: `docs/*.md`
- Test output: `evidence/*.md`
- Screenshots or binaries later: `evidence/*` in R2
- Decisions: `decisions/*.md`
- Activity logs: `logs/YYYY-MM-DD.md`

MDSync should keep the current D1/R2 split as its HA2HA implementation: D1 owns metadata and versions, R2 owns bytes.

### 6. Push And Streaming Become Later Workspace Events

A2A supports streaming and push notifications for task updates. MDSync v0 should not copy that yet.

The v0 substitute is polling:

- fetch workspace tree
- compare versions and timestamps
- fetch only changed files
- update with `baseVersion`

Later, add:

```txt
GET /api/workspaces/:workspaceId/events
```

or:

```txt
GET /w/:workspaceId/raw/events
```

Do not add this until the basic file/version workflow is proven.

## What HA2HA Should Not Copy

HA2HA should not implement full A2A v1.0 in v0.

Avoid:

- requiring every user's agent to run an online A2A server
- modeling teammates as opaque vendor agents first
- introducing JSON-RPC task orchestration before the Markdown workspace works
- building a generic agent registry
- adding real-time collaborative editing
- hiding important task state inside agent memory

The product value is that humans and agents share the same files.

## Proposed Framing

HA2HA should be described as:

> An agent-first Markdown workspace for human-supervised agent coordination.

The key distinction:

- A2A: agents collaborate directly through a protocol.
- HA2HA: humans and agents collaborate through a shared Markdown workspace with stable raw routes and optimistic concurrency.

That gives HA2HA a narrower and more practical promise: "my agent and your agent can synchronize by reading and writing the same inspectable workspace."

## Suggested Workspace Layout

```txt
HA2HA.md
STATUS.md
participants/
  pax.md
  teammate.md
tasks/
  RS-001.md
  RS-002.md
decisions/
  2026-07-08-storage-model.md
evidence/
  RS-001-api-smoke.md
logs/
  2026-07-08.md
docs/
  architecture.md
```

### `HA2HA.md`

Purpose: human-readable workspace contract.

Should include:

- workspace purpose
- participant naming rules
- task state vocabulary
- file layout
- conflict policy
- expected evidence rules

### `participants/<handle>.md`

Purpose: participant card, inspired by A2A Agent Cards but scoped to the workspace.

Example:

```md
---
id: pax-agent
human: Pax
agent_runtime: codex
can_edit: true
last_seen: 2026-07-08T12:00:00Z
---

## Current Focus

- RS-001

## Notes

- Prefer small task-file updates.
- Put command output in `evidence/`.
```

### `tasks/<id>.md`

Purpose: stable, conflict-minimized task unit.

Suggested states:

```txt
ready
claimed
working
blocked
review
done
abandoned
```

State transitions should happen through versioned file updates.

### `STATUS.md`

Purpose: compact human-readable dashboard.

This file can be regenerated by an agent from `tasks/*`, but it should still be editable by humans.

## Agent Sync Workflow

### Join A Workspace

1. Fetch the raw listing.
2. Read `HA2HA.md`, `STATUS.md`, and relevant `participants/*.md`.
3. Create or update `participants/<handle>.md` with `baseVersion`.
4. Fetch task files only as needed.

### Claim Work

1. Read `tasks/<id>.md`.
2. Confirm the task state is `ready` or assigned to this participant.
3. Update frontmatter to `claimed` or `working`.
4. Submit the update with the file's `baseVersion`.
5. On `409 Conflict`, re-read, merge, and retry once.

### Handoff Work

1. Update the task state to `review`, `blocked`, or `done`.
2. Add a short handoff note.
3. Link evidence files.
4. Update `STATUS.md` if it is manually maintained.

### Sync Documentation

1. Use smaller files for high-change docs.
2. Read the current file and version.
3. Edit the smallest useful region.
4. Submit with `baseVersion`.
5. On conflict, merge intentionally rather than overwriting.

## Product Implications

The existing MDSync v0 plan is directionally right. The important additions are HA2HA conventions and eventually small API affordances.

Near-term docs/contracts:

- Add `HA2HA.md` as the recommended workspace manifest.
- Add participant cards under `participants/`.
- Prefer one task per file under `tasks/`.
- Document a task frontmatter schema.
- Update the agent skill contract to read `HA2HA.md`, `STATUS.md`, and `tasks/` before editing.

Near-term API improvements:

- Keep raw listing stable and boring.
- Ensure agents can get versions without fetching every file. Options:
  - use the JSON tree API for agents, or
  - add a raw manifest endpoint later.
- Preserve `ETag` and `X-HA2HA-File-Version` on raw file reads.
- Keep `actor` or `updated_by` required for writes once coordination is active.

Later API improvements:

- Workspace event feed.
- Append-only log endpoint to avoid conflicts in `logs/*.md`.
- Optional signed workspace manifests.
- Optional identity layer beyond capability tokens.
- Optional import/export of a full workspace as files.

## Design Decision

HA2HA should not pitch itself as an A2A replacement. It should pitch itself as the missing shared protocol for agent-mediated teamwork.

The narrow v0 protocol is:

```txt
workspace link + raw routes + versioned Markdown files + conflict responses
```

The HA2HA layer is:

```txt
workspace manifest + participant cards + task files + evidence files + optional events
```

This keeps the system useful to humans, simple for agents, and small enough to ship.
