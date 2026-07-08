---
name: core-ha2ha-agent-alpha
description: Coordinate through HA2HA v1 workspaces using raw/API semantics. Use when Codex needs to publish a workspace, join/read a workspace, update a file with baseVersion, update STATUS.md, claim a task, add evidence, or handle HA2HA conflicts against local or deployed MDSync without using v2 product UX or v3 governance features.
---

# Core HA2HA Agent Alpha

## Overview

Use this alpha skill to coordinate through HA2HA v1 files and HTTP semantics.
This skill is protocol-aware and implementation-light: MDSync is the first
target, but product comments, dashboards, identity UX, leases, approvals,
review gates, and engineering-profile checks are out of scope.

## Required Reading

Before mutating a workspace, read the current task/request and then the minimum
protocol docs needed for the operation:

1. `docs/v1/ha2ha-protocol.md`
2. `docs/v1/workspace-conventions.md`
3. `docs/v1/http-profile.md`
4. `docs/v1/schemas-and-validation.md` when editing manifests, task
   frontmatter, target coordinates, or evidence metadata

## Safety Envelope

Declare these values before any mutating workflow:

- allowed workspace paths: usually `STATUS.md`, `tasks/<id>.md`,
  `evidence/<task-id>/*`, `logs/*.md`, and `participants/<handle>.md`
- token or identity scope: read token for reads, write token for PUT/DELETE
- actor handle: stable workspace handle such as `codex-pax` or
  `agent-context-b`
- `baseVersion`: required for updating or deleting an existing file
- conflict retry behavior: read latest, merge once, retry once; on a second
  `409`, stop and surface the conflict to the human
- evidence output: write a minimal evidence file and link it from the task
- stop conditions: missing token, missing actor, missing `baseVersion`, invalid
  path, invalid task/evidence metadata, unauthorized write, or repeated conflict

Never claim v3 coordination, trust, evidence/review, approval, lease, or
engineering-profile conformance from this skill.

## Publish Workspace

Use this when creating a new HA2HA workspace from a local directory.

1. Confirm the directory contains v1 files such as `HA2HA.md`, `STATUS.md`,
   `.ha2ha/workspace.json`, `participants/`, `tasks/`, and `evidence/`.
2. Validate when the protocol package is available:

```bash
ha2ha-validate <workspace-dir>
```

3. Publish to MDSync:

```bash
MDSYNC_BASE_URL=http://localhost:3000 \
node scripts/upload-workspace.mjs <workspace-dir> --title "<title>" --private --editable
```

4. Record the printed `Workspace ID`, `Agent raw listing`, and `Edit link`.
   Treat the edit token as a secret write token.

## Join Workspace

Use raw/API reads before writing:

```bash
curl -fsS "<raw-listing-url>"
curl -fsS -D /tmp/ha2ha.headers -o /tmp/ha2ha.file "<raw-file-url>"
curl -fsS "$MDSYNC_BASE_URL/api/workspaces/$WORKSPACE_ID/files?path=STATUS.md&edit=$MDSYNC_WRITE_TOKEN"
```

Read the target file immediately before a write and capture its `version` as
`baseVersion`. Prefer the JSON file API for versioned reads; raw reads are good
for quick human inspection and header checks.

## Update File

Use the existing MDSync script for ordinary file updates:

```bash
MDSYNC_BASE_URL=http://localhost:3000 \
MDSYNC_WRITE_TOKEN="$MDSYNC_WRITE_TOKEN" \
MDSYNC_ACTOR="$MDSYNC_ACTOR" \
node scripts/update-file.mjs "$WORKSPACE_ID" STATUS.md /tmp/STATUS.md --base-version "$BASE_VERSION"
```

For direct API calls, send `actor`, `baseVersion`, `path`, `content`, and
`contentType`:

```bash
curl -fsS -X PUT "$MDSYNC_BASE_URL/api/workspaces/$WORKSPACE_ID/files" \
  -H "Authorization: Bearer $MDSYNC_WRITE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"path":"STATUS.md","content":"...","contentType":"text/markdown; charset=utf-8","baseVersion":1,"actor":"codex-pax"}'
```

## Claim Task

A v1 claim is only a versioned update to `tasks/<id>.md`.

1. Read `tasks/<id>.md` through the JSON file API and capture `version`.
2. Edit frontmatter so it sets:

```yaml
state: claimed
owner: <actor>
updated_by: <actor>
```

3. Preserve unrelated body content and existing evidence links.
4. PUT the full task file with `baseVersion` and `actor`.
5. If the task already has an owner other than the actor, stop and ask the
   human unless the task text explicitly permits takeover.

## Add Evidence

Evidence files go under `evidence/<task-id>/`.

Use this minimal metadata:

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

Create the evidence file with `actor` and no `baseVersion` if the path does not
exist. Then update the task file with `baseVersion` to link the evidence path.

## Conflict Handling

On `409 version_conflict`:

1. Read `latest.workspaceId`, `latest.path`, and `latest.version`.
2. Merge the intended change into `latest.content`.
3. Retry once with `baseVersion` set to `latest.version`.
4. If the retry also conflicts, stop. Report the target coordinate and do not
   continue writing other files.

The conflict response target coordinate is the portable v1 anchor:
`workspaceId`, `path`, and `version`.
