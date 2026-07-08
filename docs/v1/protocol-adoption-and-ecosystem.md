# Protocol Adoption And Ecosystem

## Status

Source mode: founder-fed plus repository evidence.

This document explains why HA2HA is a protocol, how other implementations can
adopt it, and what products can be built on top of it besides MDSync. Treat
ecosystem demand, third-party adoption, and commercial opportunity as
validation gaps until public or customer evidence exists.

## Why HA2HA Is A Protocol

MDSync is the first implementation, but the shared work object should not be
trapped inside one hosted product.

The protocol exists so human-agent workspaces can be:

- portable across products
- inspectable by humans
- readable and writable by agents
- validated without reverse-engineering MDSync
- preserved by import, export, and snapshot tools
- extended through optional profiles without forcing every implementation to
  adopt the whole product surface

If the workspace contract only lives in MDSync product code, then MDSync is
just another collaboration SaaS. If the contract is HA2HA, then a local folder,
repo directory, desktop app, hosted service, IDE plugin, or competing product
can all understand the same work state.

## What The Protocol Owns

HA2HA owns the portable contract:

- canonical workspace files such as `HA2HA.md`, `STATUS.md`,
  `.ha2ha/workspace.json`, `tasks/`, `evidence/`, `decisions/`, and `logs/`
- task states and minimal task claim semantics
- actor attribution for mutating writes
- file versions and `baseVersion` conflict behavior
- versioned target coordinates: `workspaceId`, `path`, and `version`
- deterministic raw routes and HTTP headers when an implementation claims the
  HTTP profile
- minimal evidence metadata
- event and file-history protocol profiles
- schemas, examples, validators, and conformance checks

MDSync owns product behavior:

- hosted workspace UX
- browser preview and editing
- comments, dashboards, stats, diff/restore, and admin tools
- product auth, billing, retention, and support
- provider adapters
- deployment and storage implementation

This split lets MDSync be commercially useful without making the ecosystem
depend on MDSync internals.

## Adoption Levels

Third parties should be able to adopt HA2HA incrementally.

### 1. Workspace Convention

Adopt the file layout without running a server:

```txt
HA2HA.md
STATUS.md
participants/
tasks/
evidence/
decisions/
logs/
.ha2ha/workspace.json
```

This level works for repo folders, local projects, exported archives, and
manual workspaces. Agents can read the convention and write small task,
status, evidence, and decision updates.

### 2. Schema And Validator

Use the HA2HA package or CLI to validate manifests, task frontmatter, evidence
metadata, and target coordinates.

This level is useful for:

- repo checks
- pre-commit hooks
- CI validation
- local workspace repair
- product import/export validation

### 3. HTTP Profile

Expose a workspace through deterministic HTTP semantics:

- raw workspace listing
- raw file reads
- JSON file operations
- `ETag`
- `X-HA2HA-File-Version`
- `X-HA2HA-Path`
- `baseVersion` conflict behavior
- actor attribution on mutating writes

This level makes an implementation agent-friendly without requiring MDSync.

### 4. Event And History Profiles

Add durable protocol records for:

- meaningful workspace events
- file versions
- ordered event reads
- historical file reads

This level enables portable changelogs, diff/restore, audit, replay, and
conformance evidence.

### 5. Skill Adoption

Ship skills or instruction packs that teach agents how to use HA2HA safely:

- publish workspace
- join workspace
- read context
- update with `baseVersion`
- claim task
- add evidence
- record decision
- handoff
- stop on repeated conflicts

Skills should not hide state outside the workspace. Mutating skills should
declare allowed paths, token or identity scope, conflict handling, evidence
output, and stop conditions.

### 6. Optional v3 Profiles

Adopt only the profiles the product actually needs:

- coordination for claims, leases, blockers, handoffs, approvals, and
  acceptance gates
- trust for principals, human-agent pairs, roles, delegation, authority, and
  audit
- evidence/review for structured proof, review comments, questions, responses,
  and approvals
- engineering for repositories, branches, commits, issues, pull requests,
  checks, deployments, and code review references

Partial adoption is a requirement. A customer onboarding product should not
need the engineering profile. An engineering product should not need to invent
its own non-portable task and evidence model.

## How A New Implementation Claims Support

A third-party implementation should be able to claim support by:

1. Selecting the profile level it supports.
2. Publishing its supported route and file behavior.
3. Preserving canonical workspace paths.
4. Running validator checks against examples and real workspaces.
5. Running HTTP conformance checks if it exposes HTTP.
6. Publishing machine-readable conformance evidence.
7. Documenting unsupported optional profiles clearly.

The claim should be narrow. A product can support core workspaces without
supporting comments, teams, identity, engineering checks, or provider adapters.

## Products Built On HA2HA Besides MDSync

### Local-First Workspace App

A desktop app that stores HA2HA workspaces on disk and syncs through Git,
Dropbox, Syncthing, or another local-first mechanism. It would serve people who
want human-agent collaboration without a hosted SaaS dependency.

### Git Provider Companion

A GitHub, GitLab, or Forgejo companion that creates HA2HA workspaces around
pull requests, branches, releases, and reviews. It would preserve review memory,
evidence, unresolved questions, and agent handoffs around code work.

### IDE Or Agent-Surface Plugin

A plugin for Codex, Cursor, Claude Code, VS Code, JetBrains, or an internal
agent workbench. It would let agents read and update HA2HA workspaces beside
the local repo.

### Incident Command Workspace

A product for incidents where agents gather logs and timelines while humans
approve mitigations. HA2HA provides the durable incident record: hypotheses,
commands, decisions, evidence, mitigations, and follow-up tasks.

### Research And Due Diligence Workbench

A workspace for multi-agent research where claims, sources, contradictions,
open questions, decisions, and evidence are preserved as portable files.

### RFP And Security Questionnaire Room

A collaborative answer workspace where agents draft responses, evidence links
support claims, and humans approve sensitive answers before submission.

### Client Delivery Room

A product for agencies, consultants, implementation teams, or customer success.
It would coordinate scope, drafts, tasks, customer questions, approvals,
evidence, and final handoff without exposing internal chat or repositories.

### Compliance And Evidence Ledger

A product focused on proving what agents did, what checks passed, what evidence
exists, who approved, and which work remains blocked. HA2HA supplies the
portable task, evidence, decision, and audit-friendly workspace records.

### Personal AI Work Notebook

A solo workspace app where one person coordinates long-running projects with
agents. It would keep plans, decisions, source notes, task state, evidence,
and next actions alive across tools and sessions.

### Vertical Operating Rooms

Domain-specific products can use HA2HA underneath:

- legal matter rooms
- grant or application rooms
- hiring loops
- customer onboarding rooms
- launch rooms
- audit rooms
- vendor selection rooms

These products can specialize the UI while preserving the same portable
workspace records.

## Ecosystem Boundary

HA2HA should not require every product to become MDSync.

Products can compete on:

- UX
- hosting model
- security posture
- provider integrations
- vertical workflows
- search
- dashboards
- automation
- support
- retention and compliance

The protocol should remain the shared contract beneath those products:

```txt
portable workspace records
  + validation
  + conformance
  + optional profiles
```

## Open Questions

- Which third-party adoption path should be proved first: local folder,
  validator, HTTP implementation, IDE plugin, or Git provider companion?
- Which profile should be the first optional extension after core: event/history
  or coordination?
- Should conformance badges be self-generated, hosted by MDSync, or both?
- What compatibility promise should HA2HA make before external implementers
  exist?
- Which ecosystem product creates the clearest demo that HA2HA is more than
  MDSync?
