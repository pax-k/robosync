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

## `STATUS.md`

`STATUS.md` is a compact human-readable dashboard. It may be manually maintained or regenerated from `tasks/*`, but it remains a normal versioned file.

## `evidence/`

Evidence files hold proof, command output, screenshots, links, logs, and verification notes. Task files should link to evidence instead of embedding large output.

## `decisions/`

Decision files hold accepted choices, architecture records, or product decisions. They should be stable, dateable, and easy to link from task files.

## `logs/`

Logs are append-oriented human-readable activity records. Protocol event feeds may exist separately; logs remain useful because humans can inspect and edit them directly.
