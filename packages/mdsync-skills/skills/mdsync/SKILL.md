---
name: mdsync
description: Use hosted MDSync product routes through @mdsync/client while preserving HA2HA protocol boundaries. Use when Codex needs to publish or join a hosted MDSync workspace, inspect dashboard/raw/API state, update files with baseVersion, inspect comments/history/admin/capability state, rotate or verify product tokens, link users to dashboards, write evidence, and stop safely on version_conflict without relying on repo-local scripts.
---

# MDSync

## Overview

Use this skill for MDSync product scope. Hosted routes, dashboard links,
capability tokens, comments, activity/history inspection, admin stats, retention,
and team-pilot onboarding are MDSync product behavior. Portable workspace files,
task state, evidence, decisions, handoffs, `baseVersion`, and `version_conflict`
remain HA2HA protocol behavior.

Prefer `@mdsync/client` for hosted product operations. Use `@ha2ha/client` or
the protocol-only `@ha2ha/skills` package for local folders or conformant HA2HA
implementations that do not need MDSync product routes.

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

Use `@mdsync/client` to create or join hosted workspaces.

- Publish: create the workspace with current files, then return the dashboard,
  raw, and edit links that the product returns.
- Join: read workspace metadata, tree, relevant files, events, comments,
  history, and capability status before writing.
- Use read tokens only for inspection.
- Use edit tokens or supported bearer identity only for writes, comments,
  capability/admin routes, import/export, and retention.

## Mutating Workflow

For file changes, read the target file through `@mdsync/client`, keep the
returned `version`, and write with that `baseVersion`.

Allowed write targets should usually be:

- `STATUS.md`
- `tasks/<id>.md`
- `evidence/<task-id>/*`
- `decisions/*`
- `logs/*`
- `participants/<handle>.md`

For task claims and evidence, prefer the hosted HA2HA bridge from
`@mdsync/client` so product auth and protocol file semantics stay aligned.

## Product Inspection

Use product routes for human-visible context:

- comments and resolved state
- activity/events
- file history and historical previews
- capability status and token rotation result links
- admin stats
- export/import state
- retention policy and prune output
- dashboard, raw, and edit links

Treat this product inspection as a view over workspace state. Do not redefine
HA2HA task states, evidence metadata, or protocol compatibility from product
read models.

## Evidence And Handoff

Write evidence under `evidence/<task-id>/` with redacted command summaries,
check results, route names, and target coordinates. Link evidence from the task
file with a versioned update. Include dashboard or raw links only when they do
not expose credentials.

For handoff, include current task state, relevant file versions, unresolved
comments, last successful checks, blockers, and the next safe action. Do not
include raw edit tokens.
