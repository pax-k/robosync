# Product Use Cases

## Status

Source mode: founder-fed plus repository evidence.

This document captures product direction from founder discussion and current
repository docs. Treat market demand, willingness to pay, and primary customer
priority as founder/customer validation gaps until direct evidence exists.

## Product Thesis

MDSync starts as an easy place for agents to host Markdown files, but the
durable product is broader:

```txt
a shared, versioned, inspectable workspace where humans and their agents can
handoff work without losing context, evidence, decisions, or current state
```

Markdown hosting is the entry point. HA2HA-compatible synchronization is the
collaboration primitive. The hosted app, CLI, and agent skills are the product
packaging that make the primitive usable by real teams.

## Use Case Ladder

### 1. Publish One Markdown Artifact

User: solo builder, consultant, operator, or engineer using an agent.

Trigger: an agent produces a plan, report, task list, analysis, support note,
or other Markdown artifact that must be shared outside the local repo or chat.

Value moment: the agent uploads the file and returns a human preview link plus
an agent-readable raw link.

Required capabilities:

- create a workspace with one file
- browser preview
- raw Markdown route
- optional read or edit capability token

### 2. Publish A Workspace

User: a human-agent pair preparing a larger work packet.

Trigger: the output is more than one file: `README.md`, `STATUS.md`, tasks,
decisions, evidence, logs, or generated docs.

Value moment: another human or agent can browse the workspace and fetch exactly
the files needed for the next step.

Required capabilities:

- upload a folder while preserving paths
- list workspace files deterministically
- read raw files by path
- render a navigable workspace tree in the browser

### 3. Sync Between Team Members Running Their Own Agents

User: two or more teammates, each with their own agent and local context.

Trigger: separate agents need to coordinate without depending on a shared chat
thread, hidden agent memory, or direct agent RPC.

Value moment: one agent creates or updates a coordination workspace, and the
other agent reads the same versioned files before acting.

Required capabilities:

- `HA2HA.md` or equivalent workspace contract
- `STATUS.md`
- one task per file under `tasks/`
- task state and ownership conventions
- `baseVersion` updates and explicit conflict responses
- conflict retry policy that stops after a second conflict

### 4. Sync Work Between Humans And Agents

User: teams where humans review, approve, redirect, or continue agent work.

Trigger: work crosses a boundary between an agent and a human, between two
humans using different agents, or between one agent session and another.

Value moment: a human can inspect the same workspace an agent reads: current
status, tasks, decisions, evidence, blockers, and handoffs.

Required capabilities:

- rendered Markdown workspace UI
- edit flow for humans with an edit capability
- stable raw routes for agents
- evidence files linked from tasks
- decision records
- handoff notes
- file versions and explicit conflict handling

### 5. Engineering Team Work Ledger

User: engineering teams coordinating software work through their own agents.

Trigger: a feature, bug, incident, release, or review requires multiple humans
and agents to keep shared state over time.

Value moment: GitHub, CI, Linear, Slack, and local repos remain the systems that
do their specific jobs, while the HA2HA workspace records the durable work
ledger: who is working, what changed, what evidence exists, which checks pass,
what is blocked, and what is approved.

Required capabilities:

- coordination profile for claims, leases, blockers, handoffs, and approvals
- trust profile for human-agent pairs, roles, delegation, and audit
- evidence/review profile for structured proof and anchored review comments
- engineering profile for repo, branch, commit, issue, pull request, check, and
  deployment references
- hosted dashboards and provider adapters in MDSync

See [../v3/engineering-team-workflows.md](../v3/engineering-team-workflows.md).

### 6. Hosted CLI/Web Product

User: teams that need reliability, visibility, governance, and retention around
human-agent work.

Trigger: the workspace becomes important enough that capability links and local
scripts are no longer sufficient.

Value moment: the product shows what needs attention: stale claims, blocking
review, failed checks, missing evidence, unresolved questions, expiring tokens,
and release or incident readiness.

Required capabilities:

- team identity and roles
- token rotation and revocation
- activity and file history
- diff and restore
- comments and approvals
- evidence retention
- provider integrations
- admin, audit, retention, and security controls

### 7. HA2HA As A Standard

User: tool builders, agent runtimes, self-hosters, teams that need portability.

Trigger: multiple implementations need to exchange workspaces without relying
on one hosted product.

Value moment: a workspace remains understandable and valid across products,
agents, and local tooling.

Required capabilities:

- public protocol docs
- schemas
- examples and invalid fixtures
- validator CLI and package API
- HTTP conformance checks
- optional conformance profiles

## Product Surfaces

## Introduction By Version

The engineering-team collaboration product should be introduced progressively.
Do not wait until v3 to start proving the agent workflow, but do not market the
full engineering-team product before the v3 profiles exist.

| Version | Introduce | Do Not Claim Yet |
| --- | --- | --- |
| v0 | Markdown/workspace hosting, raw routes, upload/update scripts, browser preview/edit, optimistic conflicts | Durable protocol conformance, team governance, engineering collaboration |
| v1 | Core HA2HA skill alpha for publish, join/read, update, status, task claim, evidence, and conflict handling over validated protocol primitives | Hosted team governance, comments/review enforcement, engineering profile support |
| v2 | Hosted product UX that makes shared workspaces usable by humans: activity, history, diff/restore, comments, token rotation, identity/session UX, import/export, and a limited team-workspace pilot | Full engineering-team launch or profile conformance for coordination/trust/evidence/engineering |
| v3 | Engineering-team collaboration pilot and paid team tier once coordination, trust, evidence/review, and engineering profiles can be validated and enforced | Provider-specific lock-in or claims that HA2HA replaces Git, CI, issues, chat, or deployment tools |

The short answer: introduce the full engineering-team use case in v3. Ship the
skill and product prerequisites earlier so v3 is a credible launch instead of a
large speculative jump.

### HA2HA Protocol

HA2HA owns portable workspace semantics: file layout, versions, conflict
behavior, task states, profile schemas, validator rules, and conformance.

### MDSync Hosted App

MDSync owns the product experience: workspace hosting, browser preview/edit,
history, comments, review UI, dashboards, identity, retention, billing,
security controls, and provider integrations.

### CLI And Reference Scripts

The CLI or reference scripts should make the core loop reliable:

- publish one Markdown file
- publish a folder as a workspace
- read a workspace
- update one file with `baseVersion`
- append evidence
- create or update `STATUS.md`
- snapshot or export a workspace
- run validation

Scripts are implementation aids, not protocol authority.

### Agent Skills

Agent skills are the adoption layer. They teach agents how to use HA2HA
workspaces safely without hiding state from humans.

First-party skills should cover:

- publish workspace
- join workspace
- read context
- claim task
- update task
- add evidence
- record decision
- handoff
- review task
- close task
- sync pull request status

Each mutating skill should state which paths it may edit, which tokens it
requires, how it handles conflicts, and what evidence it leaves behind.

### Provider Adapters

Provider adapters belong to the product layer, not the protocol. They should
sync or reference external state from systems such as GitHub, GitLab, Linear,
Jira, Slack, CI providers, and deployment systems without making HA2HA depend
on those providers.

## Recommended First Wedge

The first public wedge should not be "a docs host" or "a new protocol" by
itself.

The strongest wedge is:

```txt
shared workspaces for human-agent teams
```

The first demo should prove that one agent can publish a workspace, another
agent can read and continue from it, and a human can inspect the same state in
the browser.

## Non-Goals

- Do not replace GitHub, GitLab, Linear, Jira, Slack, CI, or deployment tools.
- Do not become a direct agent-to-agent RPC protocol.
- Do not require real-time collaborative editing for correctness.
- Do not hide authoritative state in product-private databases when portable
  workspace files and events should represent it.
- Do not charge for protocol primitives before the ecosystem has a reason to
  adopt them.

## Open Decisions

- Primary customer: solo AI builder, engineering team, agency/client workflow,
  open-source maintainer, or another segment.
- First must-work loop: publish artifact, coordinate tasks, review evidence,
  handoff between agents, or release readiness.
- Public naming: MDSync, Robosync, or another product name backed by HA2HA.
- First provider adapter for engineering teams.
- Which agent skill format ships first: Codex skill, generic instruction pack,
  npm package, or all three.
