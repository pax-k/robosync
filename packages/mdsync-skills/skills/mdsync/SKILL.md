---
name: mdsync
description: Use hosted MDSync product routes through @mdsync/client while preserving HA2HA protocol boundaries. Use when Codex needs to publish or join a hosted MDSync workspace, inspect dashboard/raw/API state, update files with baseVersion, inspect comments/history/admin/capability state, rotate or verify product tokens, link users to dashboards, write evidence, and stop safely on version_conflict without relying on repo-local scripts.
license: MIT
---

# MDSync

## Overview

Use this skill for MDSync product scope. Hosted routes, dashboard links,
capability tokens, comments, activity/history inspection, admin stats, retention,
and team-pilot onboarding are MDSync product behavior. Portable workspace files,
task state, evidence, decisions, handoffs, `baseVersion`, and `version_conflict`
remain HA2HA protocol behavior.

Prefer `@mdsync/skills/runtime` for hosted product operations. Use `@ha2ha/client` or
the protocol-only `@ha2ha/skills` package for local folders or conformant HA2HA
implementations that do not need MDSync product routes.

## Production Deployment

Use these canonical production origins for new workspaces:

- Web and discovery: `https://mdsync-web-pax.pax.workers.dev`
- API: `https://mdsync-server-pax.pax.workers.dev`
- HA2HA documentation: `https://mdsync-ha2ha-pax.pax.workers.dev`

Discover the API from
`https://mdsync-web-pax.pax.workers.dev/.well-known/mdsync.json` before
publishing. Honor an explicit `MDSYNC_BASE_URL` for another conformant
deployment. When joining, always discover from the pasted workspace URL
instead of replacing its origin with the production default.

## Safety Envelope

Before any mutation, state:

- actor handle
- workspace id and dashboard/raw/API route
- allowed paths
- credential type: read token, edit token, bearer identity, or none
- current `baseVersion` for every existing file write
- evidence output path
- conflict retry limit
- stop condition

Stop on missing actor, missing edit token, unsupported identity session,
unauthorized product route, invalid path, missing `baseVersion`, missing
dashboard context, secret-redaction risk, or a second `409 version_conflict`.

Never store raw tokens, private credentials, bearer values, model-private
reasoning, or unredacted provider logs in workspace evidence, comments, task
files, admin notes, or handoff text.

## Hosted Join Or Publish

Prefer `@mdsync/skills/runtime` when it resolves. A skills.sh installation does
not install npm dependencies, so use the complete HTTP fallback in the
reference when the runtime is unavailable.

- Publish: call `createHa2haWorkspace()` with an explicit actor and at least one
  valid task file. Return the product links as `Viewer URL` and
  `Collaborator URL` directly to the initiating human once.
- Join: call `createMdsyncClientFromUrl()` with the pasted URL and a stable
  actor. Read Overview, `HA2HA.md`, `.ha2ha/workspace.json`, the participant
  file, and relevant tasks before writing.
- Use read tokens only for inspection.
- Use edit tokens or supported bearer identity only for writes, comments,
  capability/admin routes, import/export, and retention.
- Stop when discovery is unavailable, origins disagree, the protocol version is
  unsupported, or the URL does not provide the access required for the action.
- Validate `.ha2ha/workspace.json` with `validateMdsyncHa2haManifest()`. It
  requires the exact conflict policy `baseVersion-required`.

Follow [references/url-handoff.md](references/url-handoff.md) for the executable
SDK and HTTP workflows.

## Mutating Workflow

For file changes, read the target file through `@mdsync/skills/runtime`, keep the
returned `version`, and write with that `baseVersion`.

Allowed write targets should usually be:

- `STATUS.md`
- `tasks/<id>.md`
- `evidence/<task-id>/*`
- `decisions/*`
- `logs/*`
- `participants/<handle>.md`

For task claims and evidence, prefer the hosted HA2HA bridge from
`@mdsync/skills/runtime` so product auth and protocol file semantics stay aligned.

## Product Inspection

Use product routes for human-visible context:

- comments and resolved state
- combined product activity from `listActivity()`
- portable HA2HA events from `listEvents()`
- file history and historical previews
- capability status and token rotation result links
- admin stats
- export/import state
- retention policy and prune output
- dashboard, raw, and edit links

Treat this product inspection as a view over workspace state. Do not redefine
HA2HA task states, evidence metadata, or protocol compatibility from product
read models.

Installing `@mdsync/skills` includes the supported MDSync runtime adapter. Code
that imports `@ha2ha/protocol` directly must install that package explicitly.

## Evidence And Handoff

Write evidence under `evidence/<task-id>/` with redacted command summaries,
check results, route names, and target coordinates. Link evidence from the task
file with a versioned update. Never store Viewer or Collaborator capability
URLs in workspace content, even when the initiating human received them
directly during creation.

For handoff, include current task state, relevant file versions, unresolved
comments, last successful checks, blockers, and the next safe action. Do not
include raw edit tokens.
