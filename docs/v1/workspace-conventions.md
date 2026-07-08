# HA2HA Workspace Conventions

## Canonical Layout

```txt
HA2HA.md
STATUS.md
participants/
  <handle>.md
tasks/
  <id>.md
decisions/
  <date-or-id>.md
evidence/
  <task-id>/
logs/
  YYYY-MM-DD.md
.ha2ha/
  workspace.json
```

Implementations may allow additional files. HA2HA clients must not assume that only canonical paths exist.

## `HA2HA.md`

`HA2HA.md` is the human-readable workspace contract.

It should include:

- workspace purpose
- participant naming rules
- task state vocabulary
- file layout
- conflict policy
- expected evidence rules
- stable raw and API routes when available

## `.ha2ha/workspace.json`

`.ha2ha/workspace.json` is the machine-readable manifest.

It should include:

- protocol version
- workspace id
- workspace title
- canonical path map
- declared capabilities
- route templates
- conflict policy
- schema versions

## Versioned Targets

The portable v1 target coordinate is:

```yaml
workspaceId: abc123
path: tasks/RS-001.md
version: 18
```

Optional selectors such as headings, line ranges, or review anchors are not v1
core. They may appear in MDSync product comments and can become portable later
through the v3 evidence/review profile.

## `participants/<handle>.md`

Participant files describe a human, an agent, or a human-agent pair scoped to the workspace.

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

## `tasks/<id>.md`

Task files are the canonical conflict-minimized unit of work.

Example:

```md
---
id: RS-001
title: Implement raw workspace listing
state: ready
owner: null
updated_by: codex-pax
evidence:
  - evidence/RS-001/api-smoke.md
---

## Goal

Return a deterministic raw listing for agent clients.
```

Required states:

```txt
ready
claimed
working
blocked
review
done
abandoned
```

A minimal v1 task claim is a versioned task-file update with `baseVersion`.
The update sets `state`, `owner`, and `updated_by`. A task can be claimed only
when it is unowned or already owned by the same actor. A second conflict during
claim stops the workflow and surfaces the conflict to a human.

## `STATUS.md`

`STATUS.md` is a compact human-readable dashboard. It may be manually maintained or regenerated from `tasks/*`, but it remains a normal versioned file.

## `evidence/`

Evidence files hold proof, command output, screenshots, links, logs, and
verification notes. Task files should link to evidence instead of embedding
large output.

Minimum v1 evidence metadata:

```yaml
id: ev-RS-001-api-smoke
task: RS-001
target:
  workspaceId: abc123
  path: tasks/RS-001.md
  version: 18
kind: command
result: pass
actor: codex-pax
created_at: 2026-07-08T12:20:00Z
```

`task` or `target` must link the evidence to what it proves. Rich check
semantics, environment details, hashes, blocking review, questions, responses,
and approvals belong to later optional profiles.

## Agent Skill Safety

Mutating v1 skills must declare:

- allowed workspace paths
- required token or identity scope
- `baseVersion` read/write behavior
- conflict retry limit
- evidence output
- stop conditions

Packaging as a Codex skill, instruction pack, npm package, or bundled script is
not protocol authority.

The v1 alpha Codex skill package is
[skills/core-ha2ha-agent-alpha/SKILL.md](skills/core-ha2ha-agent-alpha/SKILL.md).
It is repo-local evidence, not the final installable HA2HA skill distribution.
The installable package work is tracked in
[tasks/V1-011-ha2ha-installable-skill-package.md](tasks/V1-011-ha2ha-installable-skill-package.md).

## Import, Export, And Snapshot Preservation

Import/export UX is product scope. When an implementation offers import,
export, or snapshot behavior and claims HA2HA compatibility, it must preserve
canonical paths, exact file contents, `.ha2ha/workspace.json`, `HA2HA.md`,
participants, tasks, evidence, decisions, logs, and claimed event/history
profile records.

## `decisions/`

Decision files hold accepted choices, architecture records, or product decisions. They should be stable, dateable, and easy to link from task files.

## `logs/`

Logs are append-oriented human-readable activity records. Protocol event feeds may exist separately; logs remain useful because humans can inspect and edit them directly.
