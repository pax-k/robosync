# v3 Transport, Validation, And Method Contracts

## Status

This is future v3 protocol direction, not current conformance authority.

v1 already defines the enforceable workspace substrate: HTTP raw routes, JSON
file operations, version headers, conflict responses, schemas, validators,
examples, and conformance checks.

v3 should decide which additional transport, validation, and method semantics
become portable protocol contracts for richer human-agent collaboration.

## Why This Exists

The v1 protocol is intentionally small. It lets humans and agents synchronize
by reading and writing versioned workspace files.

That is enough for MDSync foundation work, but broader collaboration needs more
explicit answers:

- How does a new implementation create or import a workspace?
- Which high-level operations are protocol methods versus product commands?
- Which operations must be validated offline before a write?
- Which failures are retryable, conflict-producing, authority failures, or
  human-blocking?
- Which events and evidence must be emitted after a method runs?
- Which transports are required, optional, or explicitly product-owned?

Without this layer, every implementation can expose the same files but invent
different action semantics around claims, handoffs, reviews, approvals,
checks, imports, exports, and agent skills.

## Design Position

HA2HA should standardize durable collaboration semantics, not agent execution.

v3 should not become:

- an agent RPC protocol
- an agent discovery registry
- a model-provider abstraction
- a real-time collaborative text editor
- a provider-specific GitHub, GitLab, Linear, Slack, or CI API wrapper

v3 should define:

- stable operation names where portability matters
- input and output shapes for those operations
- required preconditions
- allowed write sets
- `baseVersion` and conflict behavior
- actor, authority, and delegation requirements
- events and evidence emitted by successful operations
- failure classes and stop conditions
- conformance checks for claimed profiles

Implementations may expose these contracts over HTTP, CLI, MCP tools, local
filesystem adapters, product UIs, or agent skills. The protocol authority
remains the workspace records, schemas, validators, and conformance evidence.

## Relationship To v1

v1 owns the required base layer:

- raw workspace listing
- raw file reads
- JSON file reads, updates, creates, and deletes
- `ETag`
- `X-HA2HA-File-Version`
- `X-HA2HA-Path`
- actor attribution on mutating writes
- `baseVersion` conflict behavior
- conflict response shape
- workspace manifest validation
- task, participant, evidence, target, event, and file-version schemas
- validator CLI or package API
- HTTP conformance checks

v3 should not weaken or replace these. v3 adds optional profiles for the richer
operations that coordinate people and agents around those files.

## Transport Contract

### Required Base

The v3 base should continue to assume the v1 HTTP profile when an
implementation claims network access:

```txt
GET /w/:workspaceId/raw
GET /w/:workspaceId/raw/:path
GET /api/workspaces/:workspaceId/tree
GET /api/workspaces/:workspaceId/files?path=<path>
PUT /api/workspaces/:workspaceId/files
DELETE /api/workspaces/:workspaceId/files?path=<path>
```

The source of truth is still versioned files plus claimed event and history
records.

### Optional Delivery Transports

Real-time or integration transports should be optional delivery layers over
durable records:

- polling over HTTP
- server-sent events
- WebSockets
- signed webhooks
- local filesystem watchers
- CLI commands
- MCP tools

These transports can improve UX, but they must not become the only place where
truth exists. A reconnecting client must be able to rebuild state from files,
events, and history.

### Transport Requirements

Any v3 transport profile should define:

- authentication or capability requirements
- actor propagation
- idempotency keys for mutating operations where retries are likely
- timeout and retry expectations
- replay or refetch behavior after reconnect
- event ordering guarantees, if any
- maximum payload and unsupported-content behavior
- secret redaction requirements

## Workspace Provisioning Profile

v1 intentionally leaves workspace creation mostly implementation-specific.
MDSync has a product route for creating hosted workspaces, but that route is
not yet a portable protocol contract.

v3 should add an optional provisioning profile if third-party implementations
need portable workspace setup.

### Candidate Methods

- `workspace.create`
- `workspace.import`
- `workspace.export`
- `workspace.snapshot`
- `workspace.restore`
- `workspace.validate`

### Required Semantics

- Creation must produce `HA2HA.md`, `.ha2ha/workspace.json`, and the canonical
  path layout required by claimed profiles.
- Import, export, and snapshot operations must preserve canonical paths, file
  contents, target coordinates, events, file versions, decisions, evidence,
  logs, and claimed profile records.
- Restore must preserve provenance and record a workspace event.
- Validation should be possible without a hosted service.
- Archive format, storage provider, retention policy, and billing remain
  product scope unless a future profile explicitly standardizes them.

## Validation Contract

v3 validation should be both offline and implementation-facing.

### Offline Validation

Offline validators should check workspace records without requiring MDSync or
another hosted implementation:

- manifest shape
- canonical paths
- profile claims
- profile-specific frontmatter
- event records
- file-version records
- target coordinates
- operation records
- authority grants
- review anchors
- required evidence and checks
- import/export preservation fixtures

### Live Conformance

Live conformance checks should test a running implementation:

- required routes for claimed profiles
- status codes and conflict responses
- version headers
- actor attribution
- method preconditions
- authority failures
- retry and idempotency behavior
- event emission
- evidence emission
- preservation across import, export, and snapshot if claimed

### Validation Output

Validators should report structured issues:

- `ruleId`
- `severity`
- workspace path or route
- message
- observed value when safe
- expected behavior
- repair hint when obvious
- profile blocked by the failure

Markdown descriptions are not enough. Each v3 profile needs schemas, valid
fixtures, invalid fixtures, validator rules, and conformance checks before it
is a public compatibility promise.

## Method Contract

v3 methods should describe durable workspace operations, not remote procedure
calls into an agent.

A method is protocol-owned only when independent implementations need to agree
on its meaning and persisted result.

### Method Shape

Every v3 method should define:

- name
- profile
- purpose
- input schema
- output schema
- allowed workspace paths
- required actor
- required authority
- required `baseVersion` inputs
- state transition rules
- events emitted
- evidence emitted or updated
- idempotency behavior
- retry behavior
- conflict behavior
- blocking failure behavior
- conformance checks

### Candidate Core Methods

These methods are likely generic enough for v3 profiles:

- `workspace.validate`
- `file.read`
- `file.update`
- `file.delete`
- `task.claim`
- `task.release`
- `task.handoff`
- `task.block`
- `task.mark-ready`
- `task.request-review`
- `task.complete`
- `evidence.add`
- `review.comment`
- `review.resolve`
- `question.ask`
- `question.answer`
- `approval.record`
- `check.record`
- `decision.record`

Engineering-profile methods can reference external systems without owning the
provider implementation:

- `engineering.link-repository`
- `engineering.link-branch`
- `engineering.link-commit`
- `engineering.link-issue`
- `engineering.link-pull-request`
- `engineering.record-check`
- `engineering.record-deployment`

### Method Boundary

Protocol methods should not:

- choose an LLM provider
- start or stop an agent runtime
- execute arbitrary workspace content
- hide state outside the workspace
- require one product UI
- require one Git, issue, chat, or CI provider

Product commands and agent tools may wrap protocol methods. When they do, the
persisted workspace effect must still validate independently.

## Failure Classes

v3 should standardize enough failure classes for agents and products to behave
predictably:

- `validation_failed`: input or workspace records do not match schema.
- `version_conflict`: a required `baseVersion` is stale.
- `authority_denied`: actor lacks the required grant.
- `state_conflict`: requested transition is not allowed from current state.
- `missing_evidence`: required evidence is absent or stale.
- `unresolved_review`: blocking review remains open.
- `external_unavailable`: provider or integration is temporarily unavailable.
- `unsupported_profile`: implementation does not claim the required profile.
- `human_input_required`: method cannot safely continue without a human.

Agents should not blindly retry state, authority, validation, missing-evidence,
or unresolved-review failures. Those failures should surface to the human or
owning participant.

## Conformance Levels

v3 should keep these contracts separately claimable:

- `ha2ha-transport-http`: v1 HTTP profile plus any v3 transport additions.
- `ha2ha-provisioning`: workspace create, import, export, snapshot, restore,
  and preservation behavior.
- `ha2ha-validation`: offline validator rules, fixtures, rule IDs, and profile
  validation output.
- `ha2ha-methods`: method schemas, preconditions, allowed write sets, failure
  classes, event emission, evidence emission, and idempotency behavior.

These should compose with existing v3 collaboration profiles:

- `ha2ha-coordination`
- `ha2ha-trust`
- `ha2ha-evidence-review`
- `ha2ha-engineering`

## Open Decisions

- Should workspace creation become a v3 provisioning profile, or remain product
  scope until there is third-party demand?
- Which v3 methods are generic enough for protocol ownership?
- Should method attempts be recorded as append-only operation records, event
  records, or only as resulting file changes?
- Do mutating methods require idempotency keys?
- Which transports are safe to claim as conformance targets beyond HTTP?
- Should MCP tools be documented as one adapter over HA2HA methods, or kept
  completely outside protocol scope?
- How should validators distinguish warnings from profile-blocking errors?
- How much failed-method detail can be recorded without leaking secrets or
  provider internals?

## First Useful Slice

The smallest useful v3 slice is:

1. Keep v1 HTTP/file methods as the base.
2. Add `workspace.validate` as the first cross-profile method.
3. Add `task.claim`, `task.handoff`, `evidence.add`, and `review.comment` for
   the coordination and evidence/review profiles.
4. Define structured failure classes.
5. Add valid and invalid fixtures for those methods.
6. Add conformance checks against one local implementation or deterministic
   fake before making a public compatibility claim.
