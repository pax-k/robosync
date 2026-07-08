# Protocol Leak Review

Date: 2026-07-08

This review classifies v2 and v3 features by protocol ownership. The goal is
to keep HA2HA portable without pulling MDSync UX, hosted governance, or provider
integration details into the v1 protocol.

## Classification Legend

- v1 core protocol primitive: required for the base HA2HA protocol.
- v1 optional protocol profile requirement: required only when an implementation
  claims the relevant v1 profile or optional portable capability.
- v2 MDSync product feature: hosted product UX or product data over protocol
  primitives.
- v3 optional HA2HA profile: future portable profile, independently
  conformable and not required for simple HA2HA workspaces.
- product/provider integration only: implementation, provider, commercial,
  storage, deployment, billing, or adapter behavior outside protocol scope.

## Reviewed Sources

- v1 authority: [ha2ha-protocol.md](ha2ha-protocol.md),
  [workspace-conventions.md](workspace-conventions.md),
  [schemas-and-validation.md](schemas-and-validation.md),
  [http-profile.md](http-profile.md), [conformance.md](conformance.md), and
  [tasks/V1-008-core-ha2ha-agent-skill-alpha.md](tasks/V1-008-core-ha2ha-agent-skill-alpha.md)
- v2 product scope: [product-use-cases.md](../v2/product-use-cases.md),
  [product-roadmap.md](../v2/product-roadmap.md),
  [product-features.md](../v2/product-features.md),
  [product-data-model.md](../v2/product-data-model.md),
  [security-and-identity.md](../v2/security-and-identity.md),
  [storage-evolution.md](../v2/storage-evolution.md), and
  [tasks/](../v2/tasks/)
- v3 target scope: [collaboration-protocol.md](../v3/collaboration-protocol.md),
  [engineering-team-workflows.md](../v3/engineering-team-workflows.md),
  [open-discussions.md](../v3/open-discussions.md), and
  [tasks/](../v3/tasks/)
- Current implementation spot checks:
  [apps/server/src/workspaces/routes.ts](../../apps/server/src/workspaces/routes.ts),
  [packages/db/src/schema/workspaces.ts](../../packages/db/src/schema/workspaces.ts),
  [scripts/](../../scripts/), and
  [docs/v0/agent-skill-and-scripts.md](../v0/agent-skill-and-scripts.md)

## Promotion Decisions

Promote only these portable primitives into v1:

1. Minimal actor attribution.
   - v1 core should require a stable actor handle for mutating writes and
     current file metadata.
   - This is not identity, authority, delegation, RBAC, audit, or approval.
     Those stay in the v3 trust profile or MDSync product auth.

2. Versioned workspace target coordinates.
   - v1 core owns the portable coordinate shape: `workspaceId`, `path`, and
     `version`.
   - Optional selectors such as heading, line, or review anchor detail stay out
     of v1 core. They belong to v2 comments as product data until the v3
     evidence/review profile standardizes them.

3. Minimal task claim operation.
   - v1 core already owns task files, task states, `owner`, and `baseVersion`
     conflict behavior.
   - v1 should define a claim as a versioned task-file update that sets
     `state`, `owner`, and `updated_by`.
   - Leases, stale-claim recovery, handoffs, dependencies, blockers,
     acceptance gates, questions, and approvals remain v3 coordination profile
     behavior.

4. Minimal evidence metadata.
   - v1 core should define enough evidence metadata for agents to evaluate a
     proof file: linked task or target, kind, result, actor, and timestamp.
   - Rich check semantics, environment details, hashes, blocking review,
     questions, responses, and approval records remain v3 evidence/review or
     engineering profile scope.

5. Workspace preservation rule for import, export, and snapshot tools.
   - Export/snapshot UX is v2 product scope.
   - If an implementation offers import/export, v1 profile data must be
     preserved: paths, `HA2HA.md`, `.ha2ha/workspace.json`, participants,
     tasks, evidence, decisions, logs, and any claimed event/history profile
     records.
   - Storage layout, ZIP format, retention, backup, admin export, and audit
     export remain product/provider scope.

6. Agent skill safety contract.
   - The v1 core skill alpha is a reference-client/profile requirement, not a
     new product surface.
   - Mutating skills should declare allowed paths, required token or identity
     scope, conflict retry behavior, evidence output, and stop conditions.
   - Specific Codex packaging, npm packages, bundled scripts, install UX, and
     provider sync commands remain product/provider integration.

## v2 Classification

| Feature | Classification | V1 dependency | Boundary decision |
| --- | --- | --- | --- |
| Publish one Markdown artifact | v1 core protocol primitive | Workspace create, raw file route, capability link, file version | Hosted preview/editor and upload script UX are MDSync product packaging. |
| Publish a workspace/folder | v1 core protocol primitive | Path preservation, raw listing, raw file reads | Folder upload UX and skipped-file policy are product/reference-client behavior. |
| Sync between team members running agents | v1 core plus v1 optional skill contract | `HA2HA.md`, `STATUS.md`, task files, `baseVersion`, conflict stop policy | Rich ownership, leases, gates, and handoffs stay v3 coordination. |
| Sync work between humans and agents | v1 core plus v1 event/history profiles | Versioned files, evidence paths, decisions, handoff notes, file history | Browser edit/review/governance UX stays v2. |
| Engineering team work ledger | v3 optional HA2HA profiles | Only the shared workspace substrate is v1 | Repos, checks, PRs, approvals, and provider references are v3 profile data with product adapters. |
| Hosted CLI/web product | v2 MDSync product feature | Core HTTP/profile semantics | CLI UX, quotas, teams, retention, billing, and dashboards are product. |
| HA2HA as a standard | v1 core protocol primitive | Docs, schemas, examples, validator, conformance | Optional profile expansion belongs to v3. |
| Changelog and activity UI | v2 MDSync product feature | v1 event profile | Grouping, filtering, summaries, badges, and activity presentation are product-only. |
| File history UI | v2 MDSync product feature | v1 file-history profile | Version list, preview, and related-event UI are product-only. |
| Diff and restore | v2 MDSync product feature | v1 file versions and core write semantics | Restore must create a new current version; diff viewer UX is product-only. |
| Stats dashboard | v2 MDSync product feature | Derived from core, event, history, and task data | Stats are not protocol records unless already represented by claimed profiles. |
| Comments anchored to workspace, path, version, selector | v2 MDSync product feature | v1 target coordinate: `workspaceId`, `path`, `version` | Comments stay product data until v3 evidence/review standardizes portable review records. |
| Admin surfaces | v2 MDSync product feature | None beyond protocol data visibility | Cleanup jobs, storage health, failed jobs, retention status, and operator controls are product/provider. |
| Token rotation and revocation UX | v2 MDSync product feature | Capability links and no-token-leak safety | Rotation, revocation, active capability views, and token-use audit are product auth. |
| Users and sessions | v2 MDSync product feature | v1 participants are portable workspace records | Workspace ownership, dashboards, teams, billing, and comment authorship are product identity until v3 trust. |
| Encryption UX decision | v2 MDSync product feature | No v1 conformance dependency | Key ownership, recovery, plaintext indexing, and E2EE tradeoffs are product/security decisions. Future protocol metadata, if any, belongs after a decision. |
| Import/export workflows | v2 MDSync product feature | v1 preservation rule and event/history profiles when claimed | Export UI, archive format, backup, retention, and admin export are product/provider. |
| Retention policy | product/provider integration only | None | Schedules for workspaces, versions, events, comments, admin logs, and objects are product policy. |
| Per-workspace D1 | product/provider integration only | None | Cloudflare D1 topology, provisioning, migrations, routing, and scale isolation are implementation details. |
| Product comments table | v2 MDSync product feature | v1 target coordinate | Table shape is MDSync-specific; portable review semantics wait for v3. |
| Product users/sessions tables | product/provider integration only | None | Auth persistence is product implementation. |
| File locks | v2 MDSync product feature | v1 `baseVersion` remains the portable conflict primitive | Portable claim leases belong to v3 coordination; DB locks are product fallback only. |
| Product-only admin or billing events | product/provider integration only | None | Must not be required for HA2HA conformance. |
| Team workspace product pilot | v2 MDSync product feature | v1 skill alpha plus v2 activity/history/comments/identity UX | The pilot can expose gaps but must not claim v3 coordination/trust/evidence/engineering conformance. |
| Public launch tiers, quotas, billing, SSO, support | product/provider integration only | Protocol remains open | Commercial packaging must not redefine or restrict protocol primitives. |

## v3 Classification

| Feature | Classification | V1 dependency | Boundary decision |
| --- | --- | --- | --- |
| Decision records before schema work | v3 optional HA2HA profile | v1 docs and conformance process | Governance for future profiles; not a v1 primitive. |
| Coordination profile | v3 optional HA2HA profile | v1 task files, states, owner, actor, `baseVersion` | Dependencies, claims, leases, handoffs, blockers, acceptance, questions, and approvals are optional v3 profile semantics. |
| Trust and delegation profile | v3 optional HA2HA profile | v1 actor handle and participant files | Principals, human-agent pairs, roles, grants, delegation, audit events, and approval authority stay v3. |
| Evidence and review profile | v3 optional HA2HA profile | v1 evidence path and minimal metadata; v1 target coordinate | Structured evidence, check results, review comments, questions, responses, approvals, and blocking semantics stay v3. |
| Engineering profile | v3 optional HA2HA profile | v1 workspace plus v3 coordination/evidence foundations | Repositories, branches, commits, issues, PRs, checks, deployments, and code review references are optional v3 portable shapes. |
| Profile conformance and migration | v3 optional HA2HA profile | v1 conformance structure | Valid/invalid fixtures, rule ids, migration notes, and independent profile claims belong to v3 profile maturity. |
| Engineering-team collaboration pilot | v3 optional HA2HA profile plus MDSync product pilot | v1 substrate and v2 product UX | Pilot proves profile composition; it must not imply HA2HA replaces Git, CI, issues, chat, or deployment tools. |
| Engineering lead, engineer, agent, reviewer, automation actor model | v3 optional HA2HA profile | v1 participant and actor handles | Role authority and delegated bounds are trust profile; product UI may present them. |
| Workspace shape with `reviews/` and engineering manifest extensions | v3 optional HA2HA profile | v1 canonical workspace layout | `reviews/` and engineering extensions are profile paths, not v1 core paths. |
| Engineering skill pack commands | v3 optional HA2HA profile for semantics; product/provider integration for packaging | v1 agent skill safety contract | `sync-pr-status`, close gates, review workflows, and provider sync are not v1 core skills. |
| Product UI for stale claims, blockers, missing evidence, failed checks | v2/v3 MDSync product feature | v3 profile records when claimed | Dashboards and enforcement UX are product; portable record semantics are v3. |
| Provider links and adapters | product/provider integration only | v3 engineering reference shapes | OAuth, API polling, webhook delivery, provider persistence, and sync jobs stay behind adapters. |
| Encryption as future trust metadata | v2 product decision first; possible v3 optional profile later | None | Do not add encryption to v1 core. Metadata can be standardized only after key ownership is decided. |
| Real-time data | product/provider integration only | v1 event/history source of truth | Polling, SSE, WebSockets, notifications, and presence are delivery UX. Correctness must not depend on live sessions. |
| Skills to offer | v1 optional skill contract for core workflows; v3 optional profiles for review/engineering workflows | v1 HTTP and workspace semantics | Skill packaging is product/provider. Skills must not hide state outside workspace files and evidence. |
| Bundled scripts with skills | product/provider integration only | v1 HTTP semantics | Scripts are reference clients, not protocol authority. |
| Webhooks | product/provider integration only | v1/v3 event records when claimed | Signing, retries, idempotency, callback URLs, and write-back authority are product integration. |
| Local tunnels | product/provider integration only | None | Local development aid only; never a protocol requirement. |

## Special Concern Findings

### Actor Attribution

Current docs and code leak product ambiguity into protocol scope:

- v1 schemas draft `updated_by`, event `actor`, and file-version `updatedBy`.
- v3 trust says every write should have an actor.
- Runtime alignment now requires `actor` on file update/delete routes.
- The update script now requires `--actor` or `MDSYNC_ACTOR`.

Decision: promote the actor handle into v1 core for mutating writes and file
metadata. Keep identity proof, delegation, roles, and audit in v3 trust or
MDSync product auth.

### Versioned Target And Anchor Shape

The portable primitive is the file coordinate:

```yaml
target:
  workspaceId: abc123
  path: tasks/RS-001.md
  version: 18
```

Optional selectors are not core:

```yaml
selector:
  type: heading
  value: Acceptance
```

Decision: v1 owns `workspaceId`, `path`, and `version`. v2 comments may store
selectors as product data. v3 evidence/review can standardize selectors when
portable review is claimed.

### Task Claim Ownership Rules

v1 should support a minimal claim loop because the v1 skill alpha claims tasks:

1. Read `tasks/<id>.md`.
2. Confirm the task is unowned or owned by the caller.
3. Submit a versioned update with `baseVersion`.
4. Set `state`, `owner`, and `updated_by`.
5. Retry at most once after a conflict, then stop.

Decision: this is v1 core. Leases, stale-claim recovery, handoff records,
approval gates, and required review remain v3 coordination.

### Minimal Evidence Metadata

v1 evidence must be useful without becoming the v3 review system. Minimum
skill-authored evidence frontmatter should include:

```yaml
id: ev-RS-001-typecheck
task: RS-001
kind: command
result: pass
actor: codex-pax
created_at: 2026-07-08T12:20:00Z
```

Decision: this minimal metadata is v1 core for portable agent handoff. Command
details, environment, hashes, required checks, blocking comments, questions,
responses, and approvals remain v3 evidence/review or engineering.

### Agent Skill Contracts

v1 should define the safety contract for mutating skills:

- allowed workspace paths
- token or identity scope
- `baseVersion` read/write behavior
- conflict retry limit
- evidence output
- stop conditions

Decision: this is a v1 optional skill/reference-client requirement. Packaging
as Codex skills, generic instruction packs, npm packages, or bundled scripts is
product/provider integration.

### Workspace Snapshot And Export Preservation

Export/snapshot is product UX, but preservation is portable:

- preserve canonical paths and exact file contents
- preserve `.ha2ha/workspace.json` and schema/profile declarations
- preserve task, participant, evidence, decision, status, and log files
- preserve event/history records when those profiles are claimed
- preserve product comments separately without requiring them for conformance

Decision: v1 should define the preservation rule for implementations that offer
import/export. UI, retention, archive format, backups, admin export, and
storage migration remain v2/product/provider scope.

## Alignment Status

The alignment pass completed the repository-level follow-up for this review:

1. v1 HTTP/schema docs now make `actor` required for mutating file writes under
   core conformance.
2. v1 schema planning now includes the versioned target coordinate.
3. v1 schema planning and task files now include minimal claim and evidence
   metadata rules.
4. v1 conformance and schema planning now include preservation requirements for
   implementations that claim import/export/snapshot compatibility.
5. Current runtime and scripts now align with the tightened v1 rules:
   - `PUT /api/workspaces/:workspaceId/files` requires `actor`.
   - `DELETE /api/workspaces/:workspaceId/files` requires `actor` and
     `baseVersion`.
   - `scripts/update-file.mjs` requires `--actor` or `MDSYNC_ACTOR`.

The remaining work is implementation of the future v1 protocol packages,
schemas, examples, validators, and conformance suites tracked in
[sprint.md](sprint.md) and [tasks/](tasks/).

## Final Boundary

The v1 protocol should stay small:

```txt
workspace + paths + participant/task/evidence conventions + actor handle +
versioned target coordinate + baseVersion conflicts + minimal claim/evidence
metadata + optional event/history profiles + validators/conformance
```

MDSync v2 should own the user-facing product around those records. HA2HA v3
should own optional collaboration profiles for coordination, trust,
evidence/review, and engineering. Provider adapters and commercial governance
stay out of protocol authority.
