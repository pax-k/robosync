---
name: ha2ha
description: Coordinate through HA2HA v1 workspaces using portable protocol files, local folders, or conformant HTTP implementations. Use when Codex needs to publish or join a HA2HA workspace, validate workspace state, update a file with baseVersion, claim a task, add evidence, record a decision, write a handoff, or stop safely on HA2HA conflicts without using MDSync product-only dashboards, comments, admin, stats, hosted auth, or provider sync.
license: MIT
---

# HA2HA

## Overview

Use this skill to operate portable HA2HA v1 workspaces. Keep workspace files,
task state, evidence, decisions, and handoffs as the authority; do not hide
state in chat or product-private systems.

## Protocol Documentation

Use `https://ha2ha.md` as the canonical public HA2HA
documentation for this release. Keep the skill portable: do not infer MDSync
dashboard, capability, comment, admin, or retention behavior from the protocol.

Public references:

- Source: `https://github.com/pax-k/ha2ha-mdsync`
- Published skill: `https://skills.sh/pax-k/ha2ha-mdsync/ha2ha`
- Hosted implementation: `https://sync.ha2ha.md`
- Hosted implementation skill: `https://skills.sh/pax-k/ha2ha-mdsync/mdsync`

The hosted links are an implementation path, not part of the portable HA2HA
contract. This skill supports HA2HA Core 1.0. Treat extended collaboration
profiles as draft unless a workspace explicitly claims and validates them.

## Safety Envelope

Before any mutation, state the actor handle, target workspace, allowed paths,
credential scope, current `baseVersion`, evidence output, and stop condition.

Allowed v1 paths are usually:

- `STATUS.md`
- `tasks/<id>.md`
- `evidence/<task-id>/*`
- `decisions/*`
- `logs/*`
- `participants/<handle>.md`

Stop on missing actor, missing write credential, invalid path, invalid
frontmatter, missing `baseVersion` for an existing file, unauthorized write, or
a second `409 version_conflict`.

## Validate Workspace

Run validation before and after meaningful edits when `ha2ha-validate` is
available:

```bash
ha2ha-validate <workspace-dir>
```

Validation output is JSON. Treat `ok: false` as a stop condition unless the
current task is specifically to repair the workspace.

## Local Folder Workflow

Use this mode for repo folders, exported workspaces, or local-first workspaces.
Read `HA2HA.md`, `STATUS.md`, the relevant participant file, target task, and
linked evidence before writing. If event/history profile files exist, preserve
`.ha2ha/workspace-events.json` and `.ha2ha/file-versions.json`.

For detailed local-folder steps, read
`references/local-folder-workflows.md`.

## HTTP Workflow

Use this mode for conformant HTTP implementations. Prefer API reads when a
write is planned so the current `version` can be used as `baseVersion`.

For detailed HTTP routes, credentials, and conflict handling, read
`references/http-workflows.md`.

## Claim Task

A v1 claim is a versioned full-file update to `tasks/<id>.md`:

```yaml
state: claimed
owner: <actor>
updated_by: <actor>
```

Preserve the task body and existing evidence links. If the task has another
owner, stop unless the task explicitly permits takeover.

## Add Evidence

Write evidence under `evidence/<task-id>/` with minimal v1 metadata:

```yaml
---
id: ev-<task-id>-<short-name>
task: <task-id>
target:
  workspaceId: <workspace-id>
  path: tasks/<task-id>.md
  version: <task-version>
kind: command
result: pass
actor: <actor>
created_at: <iso-timestamp>
---
```

Then link the evidence path from the task file through a versioned task update.

## Record Decision Or Handoff

Use `decisions/` for accepted choices and `logs/` for handoff notes. Do not
claim v3 leases, approvals, review gates, trust/delegation, engineering
references, or required-check enforcement from this v1 skill.
