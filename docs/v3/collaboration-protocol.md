# HA2HA Collaboration Protocol Target

HA2HA v3 describes what the protocol needs to become if it is aimed at humans
cooperating through agents for any agentic work, including engineering.

This is not the current conformance baseline. v1 remains the current HA2HA
protocol authority. v3 is the target protocol shape for the next maturity
stage.

## Sufficiency Review

The v1 protocol is enough for the narrow MDSync foundation:

- shared workspace identity
- human-readable and machine-readable manifests
- deterministic raw routes
- versioned files
- optimistic conflict handling through `baseVersion`
- task, participant, evidence, decision, log, and status conventions
- event and file-history profiles
- planned schemas, validators, examples, and conformance checks

That is a strong shared-file synchronization protocol.

It is not yet enough for broad human-agent collaboration because several
collaboration concerns are only basic, deferred, or product-scoped:

- task files do not yet express dependencies, acceptance criteria, review gates,
  priority, ordering, blockers, deliverables, or approval requirements.
- participants do not yet express role, authority, delegated rights, pairing
  between a human and an agent, or approval power.
- `baseVersion` handles file conflicts, but not stale claims, leases, handoffs,
  multi-file work, or atomic coordination intent.
- evidence is a workspace convention, but not yet a structured proof contract.
- comments and review are product scope in v2, but they become protocol
  concerns when independent humans and agents need portable asynchronous
  collaboration.
- identity, token rotation, revocation, and audit are mostly product maturity
  topics today, but broad agentic work needs at least a minimal trust profile.
- engineering work has no first-class vocabulary for repos, branches, commits,
  issues, pull requests, checks, deployments, or test evidence.

## Design Position

HA2HA should stay file-first and human-inspectable. It should not become an
agent RPC protocol, a generic agent registry, or a real-time editor.

v3 should add protocol profiles over the v1 workspace substrate:

```txt
v1 core workspace
  + v3 transport, validation, and method contracts
  + v3 coordination profile
  + v3 trust profile
  + v3 evidence and review profile
  + v3 engineering profile
```

Transport, validation, provisioning, method boundaries, and shared failure
classes are captured in
[transport-validation-methods.md](transport-validation-methods.md). Those
contracts should remain cross-cutting so individual profiles do not invent
incompatible action semantics.

Each profile should have:

- public primitives
- Markdown conventions
- machine-readable schemas
- valid and invalid examples
- conformance checks
- compatibility notes
- clear ownership boundaries between HA2HA and product UI

## Coordination Profile

The coordination profile should make work delegation, claiming, handoff,
review, and completion portable across implementations.

### Public Primitives

- work item: a task, decision request, investigation, review, fix, or delivery
  unit.
- dependency: another work item, artifact, decision, or external condition that
  must be satisfied.
- claim: an explicit statement that a participant is taking responsibility for
  a work item.
- lease: an optional expiry for a claim so stale work can be recovered.
- handoff: a structured transfer of context from one participant to another.
- acceptance criterion: a condition that must be true before work can be marked
  done.
- blocker: a condition that prevents progress and identifies who or what can
  unblock it.
- approval: a participant decision that work may proceed, merge, publish, or
  close.
- question: a request for human or participant input that blocks or influences
  execution.

### Task Frontmatter Extensions

```yaml
id: RS-001
title: Implement raw workspace listing
state: working
owner: codex-pax
priority: medium
depends_on:
  - RS-000
blocked_by: []
acceptance:
  - Raw listing returns deterministic paths.
  - File versions are visible without fetching every file.
claim:
  participant: codex-pax
  claimed_at: 2026-07-08T12:00:00Z
  lease_expires_at: 2026-07-08T14:00:00Z
review:
  required: true
  reviewers:
    - pax
approvals: []
evidence:
  - evidence/RS-001/api-smoke.md
```

### Required Semantics

- A task can be claimed only from an allowed state or by its current owner.
- A stale lease can be reclaimed according to the workspace conflict policy.
- A task cannot move to `done` when required acceptance criteria, review, or
  approval records are missing.
- A second write conflict during claim or handoff should stop and surface the
  conflict to a human.
- Handoffs should include summary, current state, next action, blockers, and
  linked evidence.

## Trust Profile

The trust profile should define who acted, what they were allowed to do, and
which human authority stands behind an agent action.

### Public Primitives

- principal: a human, agent runtime, service account, or team identity.
- participant: a principal active in a workspace.
- human-agent pair: a declared relationship between a human and the agent acting
  for them.
- role: a workspace-scoped responsibility such as owner, maintainer, reviewer,
  contributor, observer, or automation.
- authority grant: a scoped permission to read, write, claim, approve, publish,
  or administer.
- delegation: a record that an agent may act for a human within explicit
  bounds.
- audit event: an append-only event that records sensitive or authority-bearing
  actions.

### Participant Frontmatter Extensions

```yaml
id: codex-pax
kind: human-agent-pair
human: pax
agent_runtime: codex
roles:
  - contributor
  - reviewer
can_edit: true
authority:
  can_claim: true
  can_approve: false
  can_publish: false
delegated_by: pax
delegation_scope:
  paths:
    - tasks/
    - evidence/
    - docs/
  max_effect: workspace-write
last_seen: 2026-07-08T12:00:00Z
```

### Required Semantics

- Every write should have an actor.
- Every approval should identify the approving principal and authority basis.
- Agent actions should remain distinguishable from direct human actions.
- Sensitive changes should create audit events when the trust profile is
  claimed.
- Secrets, private credentials, and raw tokens must not be written into
  manifests, evidence, logs, or audit events.

## Evidence And Review Profile

The evidence and review profile should make proof, comments, questions, and
approval records portable rather than product-private.

### Public Primitives

- evidence record: structured proof linked to a work item.
- check result: pass, fail, skipped, blocked, or unknown verification outcome.
- review comment: anchored feedback on a path, version, heading, line, task, or
  artifact.
- question: a review or execution question requiring a response.
- response: an answer linked to a question.
- approval record: a durable statement that a reviewer accepted a work item,
  artifact, or change.

### Evidence Record Shape

```yaml
id: ev-RS-001-api-smoke
task: RS-001
kind: command
command: pnpm test
result: pass
actor: codex-pax
created_at: 2026-07-08T12:20:00Z
environment:
  cwd: /workspace
  runtime: node
artifacts:
  - path: evidence/RS-001/test-output.txt
hashes:
  evidence/RS-001/test-output.txt: sha256:hex
```

### Review Anchor Shape

```yaml
id: rvw-001
target:
  path: tasks/RS-001.md
  version: 18
  selector:
    type: heading
    value: Acceptance
state: open
author: pax
assigned_to: codex-pax
severity: blocking
created_at: 2026-07-08T12:30:00Z
```

### Required Semantics

- Evidence should link to a task, decision, artifact, or review target.
- Evidence should record actor, timestamp, result, and enough environment
  context for another participant to evaluate it.
- Review comments should be anchored to stable workspace coordinates:
  `workspaceId`, `path`, `version`, and optional selector.
- Blocking review comments should prevent completion when the coordination
  profile is also claimed.
- Approval records should link to the evidence or review state they accepted.

## Engineering Profile

The engineering profile should make software work first-class without turning
HA2HA into a Git provider API.

Concrete engineering-team product workflows for this profile are captured in
[engineering-team-workflows.md](engineering-team-workflows.md).

### Public Primitives

- repository: a source control repository relevant to the workspace.
- branch: a branch or working line tied to a work item.
- commit: a source control revision.
- issue: an external or workspace-native issue.
- pull request: a reviewable change request.
- check: CI, lint, test, build, deploy, smoke, security, or policy result.
- deployment: an environment update or release attempt.
- code review: comments, approvals, requested changes, and unresolved threads.

### Engineering Workspace Manifest Extension

```json
{
  "profiles": ["coordination", "trust", "evidence-review", "engineering"],
  "engineering": {
    "repositories": [
      {
        "id": "robosync",
        "provider": "github",
        "url": "https://github.com/example/robosync",
        "defaultBranch": "main"
      }
    ],
    "checks": [
      {
        "id": "ultracite",
        "command": "pnpm dlx ultracite check",
        "requiredFor": ["review", "done"]
      }
    ]
  }
}
```

### Engineering Task Extensions

```yaml
id: RS-042
title: Add HA2HA validator package
state: review
repository: robosync
branch: codex/ha2ha-validator
issues:
  - GH-123
pull_requests:
  - provider: github
    id: 456
    url: https://github.com/example/robosync/pull/456
checks:
  - id: ultracite
    result: pass
    evidence: evidence/RS-042/ultracite-check.md
  - id: unit-tests
    result: pass
    evidence: evidence/RS-042/unit-tests.md
deployment: null
```

### Required Semantics

- Engineering references should be links or identifiers, not provider-specific
  persistence models.
- Required checks should be declared in the workspace manifest or task file.
- A task should not move to `done` when required checks are failing, missing, or
  stale.
- Pull request and deployment states should be evidence-linked rather than
  copied as unverified prose.
- Provider adapters belong to implementations. HA2HA owns the portable shape.

## Conformance Levels

v3 should keep partial adoption possible:

- `ha2ha-core`: v1 workspace, file, version, conflict, event, and history
  behavior.
- `ha2ha-transport-http`: v1 HTTP profile plus any v3 transport additions.
- `ha2ha-provisioning`: workspace create, import, export, snapshot, restore,
  and preservation behavior.
- `ha2ha-validation`: offline validator rules, fixtures, rule IDs, and profile
  validation output.
- `ha2ha-methods`: method schemas, preconditions, allowed write sets, failure
  classes, event emission, evidence emission, and idempotency behavior.
- `ha2ha-coordination`: work items, dependencies, claims, leases, handoffs,
  acceptance, questions, and approvals.
- `ha2ha-trust`: participant identity, roles, delegation, authority grants, and
  audit events.
- `ha2ha-evidence-review`: structured evidence, review comments, questions,
  responses, and approval records.
- `ha2ha-engineering`: repository, branch, commit, issue, pull request, check,
  deployment, and code review references.

An implementation should be able to claim one profile without claiming all of
them.

## Product Boundary

HA2HA v3 should own:

- portable vocabulary
- file conventions
- schema shapes
- event types
- conflict, claim, handoff, review, approval, and evidence semantics
- profile conformance requirements
- cross-profile method and failure semantics

Products should own:

- visual dashboards
- notification delivery
- interactive review UI
- provider OAuth flows
- billing and administration
- retention policy
- storage implementation
- proprietary automation

The protocol should define what must be preserved and exchanged. Product UX
should decide how people see and act on it.

## Enforcement Plan

Markdown is not enough for v3. Each profile needs:

- JSON schema for machine-readable manifest extensions.
- frontmatter schema for profile-specific Markdown files.
- valid fixture workspaces.
- invalid fixture workspaces for missing authority, stale claim, missing
  required evidence, unresolved blocking review, failed checks, and invalid
  engineering references.
- validator rules with stable rule ids.
- conformance tests against a running implementation.
- migration notes from v1/v2 documents.

## Open Decisions

- Whether comments stay product-only in v2 or become a v3 protocol profile when
  shared review is claimed.
- Whether claims and leases are represented only in task frontmatter or also in
  append-only event records.
- How much identity HA2HA can standardize without forcing a specific auth
  provider.
- Whether approvals require human principals, or whether agents can approve
  within delegated authority.
- How to represent multi-file work without introducing heavy transaction
  semantics.
- Which engineering checks are generic enough for protocol conformance and
  which remain workspace policy.
