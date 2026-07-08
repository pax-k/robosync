# Top-Down Work Orchestration

## Status

Source mode: founder-fed plus repository evidence.

This document captures the v4 direction for creating and governing work from
the MDSync dashboard first, then letting agents pick up eligible work.

It is MDSync product scope. It does not make HA2HA an agent runtime, agent RPC
protocol, or generic worker scheduler.

## Product Thesis

Earlier HA2HA and MDSync workflows are mostly agent-initiated:

```txt
human opens Codex, Claude Code, Cursor, or another agent surface
  -> invokes a skill
  -> agent joins a workspace
  -> agent claims a task
  -> MDSync shows the resulting workspace state
```

v4 should also support a dashboard-initiated workflow:

```txt
human or team creates work in MDSync
  -> MDSync writes durable work intent, constraints, and policy
  -> eligible agents discover or receive the work
  -> agents claim, execute, and write evidence back
  -> MDSync shows progress, blockers, review, and next action
```

The control plane should author work intent. Agent runtimes remain systems of
action. This keeps MDSync responsible for shared state, authorization,
visibility, and governance without pretending to own every agent execution
environment.

The same flow applies outside engineering. For reusable domain-room examples
such as RFP/security questionnaires, client delivery, incident/audit,
research, hiring, and application packets, see
[vertical-room-flows.md](vertical-room-flows.md).

## Core Boundary

Dashboard-created work must not become hidden product-only state when the team
expects agents and humans to coordinate through HA2HA.

The product board is the ergonomic view. The workspace record is the durable
coordination layer.

```txt
MDSync board card
  materializes to or indexes
HA2HA task file
  links to
evidence, decisions, reviews, checks, branches, pull requests, and deployments
```

If a card is not materialized into a workspace task, it must be labeled as
product-only planning state and should not be offered to protocol agents as
portable HA2HA work.

## Board Model

The v4 board should feel familiar to users of Linear, Jira, GitHub Projects, or
Trello, while preserving MDSync's workspace-first state model.

```txt
team
  project or initiative
    workspace
      board
        card / work item
          tasks/<id>.md
          evidence/<id>/
          reviews/
          decisions/
```

A work item should include:

- title
- description
- state
- priority
- labels
- workspace
- target task path
- acceptance criteria
- required evidence
- allowed paths or effect scope
- assignee or agent eligibility
- due date or lease window when needed
- repository, branch, issue, pull request, check, or deployment links
- review and approval requirements

## Work States

Use the existing HA2HA task states once work is materialized:

```txt
ready
claimed
working
blocked
review
done
abandoned
```

The dashboard may also have a product-only `draft` state before a card is
published into a workspace task. `draft` is not a HA2HA task state.

## Agent Inbox

Agents need a product-level way to discover work without scraping every board.
The first v4 agent pickup surface should be an **agent inbox**.

An agent inbox query returns ready or assigned work filtered by:

- team
- workspace
- service account or actor handle
- declared capabilities
- allowed paths
- labels
- priority
- risk level
- required tools or integrations
- stale claim recovery rules

The inbox should return structured work summaries plus target coordinates, not
raw dashboard internals.

Example shape:

```json
{
  "workItems": [
    {
      "id": "wi_123",
      "workspaceId": "abc123",
      "taskPath": "tasks/RS-042.md",
      "title": "Add team aggregate stats",
      "state": "ready",
      "priority": "high",
      "allowedPaths": ["packages/db/", "apps/server/"],
      "requiredEvidence": ["check-types", "server-tests"],
      "claimUrl": "/api/teams/team_123/work-items/wi_123/claim"
    }
  ]
}
```

## Pickup Modes

### Pull Mode

Pull mode should be the first slice.

Use when a human is still operating Codex, Claude Code, Cursor, or another
local agent surface. The human invokes a skill such as:

```txt
mdsync get-next-work
mdsync claim-work wi_123
mdsync add-evidence wi_123 evidence/RS-042/check-types.md
mdsync handoff wi_123
```

The skill reads the agent inbox, claims one work item through MDSync, then uses
normal HA2HA file updates with `baseVersion`.

### Event Mode

Event mode can follow after pull mode.

Use signed webhooks or durable polling for hosted agents, provider adapters, or
internal workers. Delivery is a notification that work is available, not the
source of truth.

Event mode requires:

- signed deliveries
- idempotency keys
- retry limits
- least-privilege service-account tokens
- explicit authority checks before mutation
- audit events for claims, releases, and sensitive transitions

### Hosted Runner Mode

Hosted runner mode is a later product option.

MDSync may eventually run first-party or configured agent workers, but that
adds sandboxing, credential, billing, observability, and runtime-isolation
requirements. It should not be the first implementation of top-down
orchestration.

## Control Flow

1. A team owner creates a project, workspace, or board.
2. A human creates a card with acceptance criteria, constraints, and required
   evidence.
3. MDSync materializes the card into a workspace task file and records a
   product audit event.
4. The card appears in the team board and eligible agent inboxes.
5. An agent claims the work with a version-aware task update.
6. MDSync records the claim and shows the card as claimed or working.
7. The agent executes in its own runtime and writes evidence, decisions,
   status, and handoff notes.
8. MDSync updates the board from workspace records and product indexes.
9. Humans review, approve, block, reassign, or request more evidence.
10. The task reaches `done` only when required evidence and review policy are
    satisfied.

## Cross-Boundary Flow Pattern

Every top-down flow should cross at least one real boundary:

- human to agent
- internal team to external customer or reviewer
- UI control surface to portable workspace record
- workspace state to external system of action
- draft work to approved publication, submission, mitigation, or closure

The product pattern is:

```txt
human intent in UI
  -> durable workspace record
  -> bounded agent pickup
  -> evidence, draft, artifact, question, or blocker
  -> UI review and next required action
  -> human approval, redirect, block, publish, or close
```

If a flow does not require human review, visibility, authority, or handoff
across a boundary, it is probably a simpler automation and not a strong MDSync
v4 room.

## Board To Workspace Materialization

When a card becomes protocol-visible work, MDSync should create or update a
task file similar to:

```yaml
---
id: RS-042
title: Add team aggregate stats
state: ready
owner: null
priority: high
labels:
  - v4
  - observability
acceptance:
  - Team stats aggregate files, versions, comments, conflicts, and health.
  - Capability links do not grant team stats access.
required_evidence:
  - check-types
  - server-tests
allowed_paths:
  - apps/server/
  - packages/db/
created_by: pax
updated_by: pax
---

## Work

Implement the team aggregate stats API and tests.
```

Fields beyond the v1 minimal task schema are product and future-profile
direction until validators enforce them. MDSync can still use them as product
metadata, but public HA2HA claims must stay honest about which fields are
validated.

## Human Controls

The board should let humans:

- create cards
- edit acceptance criteria
- set priority and labels
- select target workspace
- assign to a human, service account, agent class, or unassigned queue
- define allowed paths and effects
- require evidence
- require review or approval
- block or unblock work
- reassign stale work
- request handoff
- close or abandon work

Each sensitive action should emit a team audit event.

## Agent Controls

Agents should be able to:

- list eligible work
- inspect one work item
- claim work
- release work
- mark blocked
- add evidence
- write a handoff
- request review
- mark ready for human review

Agents should not be able to:

- assign themselves broader scopes
- change their own service-account grants
- bypass required evidence
- approve high-risk work unless explicitly granted
- execute product-only dashboard actions that have no workspace record

## Failure Semantics

Top-down orchestration needs clear failures:

- `no_eligible_work`: inbox has no claimable work for this actor.
- `authority_denied`: actor cannot view or claim the work item.
- `state_conflict`: work is no longer in a claimable state.
- `version_conflict`: target task file changed.
- `missing_evidence`: transition requires evidence that is absent or stale.
- `unresolved_review`: blocking review remains open.
- `external_unavailable`: provider or runner integration is unavailable.
- `human_input_required`: policy requires a human decision.

Agents should not blindly retry authority, state, missing-evidence,
unresolved-review, or human-input failures.

## First Useful Slice

The smallest credible v4 slice is:

1. Team owner creates a workspace board in MDSync.
2. Human creates one card in `ready`.
3. MDSync materializes `tasks/<id>.md`.
4. A local Codex or Claude skill calls the agent inbox in pull mode.
5. The agent claims the task, writes evidence, and requests review.
6. The board updates from the task state and evidence links.
7. A human reviews and closes the work from MDSync.

This proves the top-down promise without requiring hosted agent execution.

## Non-Goals

- Do not make MDSync launch arbitrary local agents in v4.0.
- Do not require agents to be always-online servers.
- Do not turn HA2HA into a queue protocol.
- Do not hide work state only in board tables.
- Do not replace Linear, Jira, GitHub, CI, deployment, or team chat.
- Do not allow product webhooks to mutate work without scoped authority.

## Open Decisions

- Is the first board scoped to one workspace or can it span many workspaces?
- Should every card materialize immediately, or can teams keep product-only
  drafts?
- What is the minimum service-account capability declaration for inbox
  matching?
- Should pull-mode agent inbox APIs live under `/api/teams/:teamId` or under a
  product skill route?
- Which card fields are product-only in v4 and which should be promoted into a
  future HA2HA coordination profile?
