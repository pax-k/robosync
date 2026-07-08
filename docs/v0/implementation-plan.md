# v0 Implementation Plan

## Phase 1: Scaffold

- Keep `apps/web` as the MDSync workspace application.
- Keep `apps/server` as the MDSync API/backend implementation.
- Configure D1 binding for workspace metadata.
- Configure R2 binding for file bytes.
- Add the first D1 migration for `workspaces` and `workspace_files`.

## Phase 2: Core API

- Implement workspace creation.
- Implement workspace metadata fetch.
- Implement tree fetch.
- Implement file fetch.
- Implement raw workspace listing.
- Implement raw file fetch.
- Implement R2 object writes and reads.
- Implement path normalization and validation.
- Implement capability-token read/write checks.

## Phase 3: Concurrency

- Add file `version` handling.
- Add conditional D1 update logic after R2 upload.
- Add best-effort R2 cleanup when a conditional D1 update fails.
- Return `409 Conflict` with latest file data.
- Add delete behavior with optional `baseVersion`.
- Add focused tests for concurrent update behavior.

## Phase 4: Browser UI

- Build workspace route `/w/:workspaceId`.
- Build left navigation from the tree API.
- Build Markdown preview panel.
- Build edit mode when an edit token is present.
- Show file version, updated timestamp, and updated actor.
- Handle stale-save conflict by showing reload behavior.

For v0, reload is required and overwrite can be omitted.

## Phase 5: Agent Skill And Scripts

- Add upload scripts:
  - `upload-file.mjs`
  - `upload-workspace.mjs`
  - `update-file.mjs`
- Document environment variables.
- Add sample prompts for publishing a report and updating a workspace.
- Test scripts against local dev.

## Phase 6: Verification

- Run TypeScript checks.
- Run unit tests for path validation, permission checks, and conflict behavior.
- Run local D1 migrations.
- Verify local R2 binding behavior.
- Smoke test:
  - create workspace
  - fetch raw listing
  - fetch raw file
  - open browser workspace
  - edit file
  - force a conflict and confirm `409`

## First Build Slice

The first useful slice should be:

1. D1 migration.
2. R2 binding.
3. `POST /api/workspaces`, storing file bytes in R2 and metadata in D1.
4. `GET /w/:id/raw`.
5. `GET /w/:id/raw/:path`.
6. Minimal upload script.

This proves the agent-first value before spending time on the browser editor.

## Implementation Rules

- Keep workspace as the primary resource.
- Treat single-file docs as one-file workspaces.
- Keep D1 as the canonical file index.
- Keep R2 as the file-byte store.
- Do not use R2 listing to derive workspace trees.
- Keep raw routes plain text.
- Keep browser routes app-owned.
- Do not add auth until capability links have shipped.
- Do not add real-time collaboration in v0.
- Do not add per-file permissions in v0.

## Explicitly Deferred

v0 does not implement `workspace_events`, durable `workspace_file_versions`, comments, users, sessions, `file_locks`, per-workspace D1, encryption, protocol validators, or conformance suites.
