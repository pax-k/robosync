# MDSync Testing Strategy

This document defines the test backfill and task-update strategy for MDSync and
HA2HA work. It exists to support a pursue-goal prompt that can add relevant
unit, integration, and end-to-end tests to existing apps and packages, then
update ready todo tasks so future work treats tests as required completion
evidence.

## Pre-Backfill Baseline

Before this backfill, the repo had committed automated tests in:

- `packages/ha2ha-protocol/src/validator.test.ts`
- `packages/ha2ha-http/src/conformance.test.ts`

The existing green baseline from inspection:

```bash
pnpm --filter @mdsync/ha2ha-protocol test
pnpm --filter @mdsync/ha2ha-http test
pnpm run check-types
pnpm run check
```

Before this backfill, the root workspace did not have a `test` script or Turbo
`test` task. Most v0 implementation behavior was proven by shell smoke, manual
browser smoke, and task evidence rather than committed regression tests.

## Testing Lanes

Use three lanes.

1. Unit and contract tests: use the existing `tsx --test` plus `node:test`
   pattern for TypeScript packages and pure app modules.
2. Integration tests: test server routes, workspace persistence, token
   authorization, event creation, file history, and script behavior against
   deterministic fakes or a local Worker/D1/R2 harness.
3. End-to-end tests: use Playwright for browser flows that must prove real UI
   behavior across `apps/web`, `apps/ha2ha`, and the server.

Do not migrate the whole repo to a new runner before the first backfill. Keep
the runner change small: add root scripts and wire package tests into Turbo.
Introduce React Testing Library or Vitest only when component-level tests are
clearly cheaper than Playwright or pure helper tests.

## Root Test Gate

Add these scripts at the root when implementing the backfill:

```json
{
	"test": "pnpm run test:scripts && turbo run test",
	"test:unit": "pnpm run test:scripts && turbo run test --filter='./packages/*' --filter='./apps/*'",
	"test:integration": "turbo run test:integration --filter='@mdsync/db' --filter='@mdsync/ha2ha-http'",
	"test:e2e": "playwright test"
}
```

Add Turbo tasks for `test`, `test:integration`, and `test:e2e`. Keep `test`
dependent on package build/type surfaces only where the local package needs it.
Run `test:scripts` at the root because the script helpers are not a package.
Do not make e2e run as part of every fast unit pass.

## App And Package Strategy

### `apps/server`

Priority: highest.

Backfill pure unit tests for `apps/server/src/workspaces/domain.ts`:

- `normalizeFilePath` accepts normalized relative paths.
- `normalizeFilePath` rejects empty paths, absolute paths, dot segments,
  duplicate slashes, backslashes after normalization edge cases, trailing
  slashes, and overlong paths.
- `assertValidAccess` rejects public writes without public reads.
- `buildWorkspaceUrls` produces correct web/API origins and token query
  behavior without leaking token hashes.
- `formatRawListing` preserves HA2HA heading, title, update timestamp, sorted
  file paths, and trailing newline.
- `extractBearerToken`, `contentSizeBytes`, and token/hash helpers behave
  deterministically where possible.

Backfill route integration tests for `apps/server/src/workspaces/routes.ts`:

- Create workspace returns `201`, workspace URL, raw URL, and edit URL.
- Create rejects invalid and duplicate file paths.
- Metadata and tree reads require valid read or edit capability for token
  workspaces.
- Raw listing includes the HA2HA workspace heading and expected files.
- Raw file responses include `X-HA2HA-File-Version`, `X-HA2HA-Path`, `ETag`,
  and the correct content type.
- Existing-file update requires `actor` and `baseVersion`.
- New-file create requires `actor` and produces version `1`.
- Stale update returns `409 version_conflict` with latest file data.
- Delete requires `actor` and `baseVersion`.
- Stale delete returns `409 version_conflict`.
- Event routes expose file create, update, and delete events with actor, path,
  version, workspace id, timestamp, and payload metadata.
- File-history routes list versions and read historical content without
  mutating current file state.
- Failed conditional writes clean up uploaded objects best effort when a test
  harness can observe object deletion.

Do not over-invest in private SQL helper tests. Route-level integration tests
are the safer contract for D1/R2 behavior.

### `apps/web`

Priority: high, through Playwright first.

Backfill e2e tests for:

- Create workspace from the empty route and navigate to the returned workspace
  URL.
- Load metadata, file tree, selected file content, raw link, and edit state.
- Save a file with `baseVersion` and observe the version bump in the UI.
- Load read-only/read-token mode and verify save/edit controls are absent.
- Refresh reloads tree and selected file.
- Stale save conflict loads latest content and displays the conflict message.
- Browser console has no unexpected errors or warnings during the core flow.

Extract pure helpers from `apps/web/src/app.tsx` only if unit tests need them:

- API base URL resolution.
- workspace id path parsing.
- capability query construction.
- raw file path encoding.
- response error-message parsing.

### `apps/ha2ha`

Priority: medium.

Backfill e2e or smoke tests for:

- The protocol site renders the main sections: Workspace, HTTP, Schemas,
  Examples, and Conformance.
- Displayed route/header/capability/task-state values come from
  `@mdsync/ha2ha-protocol` constants.
- The Cloudflare/Vite Worker SPA fallback returns `index.html` for missing GET
  routes that accept HTML.
- Non-HTML or non-GET missing asset requests preserve the asset response.

### `packages/ha2ha-protocol`

Priority: high.

Expand existing validator tests with focused contract cases:

- Workspace path schema accepts only normalized relative paths.
- Target coordinates require `workspaceId`, `path`, and positive integer
  `version`.
- Evidence metadata requires either `task` or `target`.
- Task frontmatter rejects unknown states.
- Participant frontmatter requires stable ids.
- Invalid JSON, invalid YAML, and missing frontmatter produce stable rule ids.
- Import/export preservation capability requires all canonical paths.
- Constants remain stable for public protocol paths, headers, task states,
  event types, and conflict fields.

Keep valid and invalid fixtures as the main public contract surface.

### `packages/ha2ha-http`

Priority: high.

Expand conformance tests with negative and profile-specific cases:

- A failed workspace create records the failed check and stops dependent checks.
- Missing actor on update/delete fails the required check.
- Bad conflict response shape fails `file.update.conflict`.
- Missing raw file headers fail the HTTP profile.
- Missing event routes fail event-profile checks without obscuring earlier
  core-workspace passes.
- Missing file-history routes fail file-history-profile checks.
- Check ids remain stable because task evidence and conformance reports depend
  on them.

The live conformance command remains a smoke/conformance gate:

```bash
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
```

### `scripts`

Priority: medium.

Backfill unit tests for `scripts/lib/mdsync.mjs`:

- `collectWorkspaceFiles` preserves relative POSIX paths.
- `collectWorkspaceFiles` skips `.git`, `.turbo`, `.wrangler`, `.alchemy`,
  `dist`, `coverage`, `node_modules`, binary files, and `.DS_Store`.
- `contentTypeForPath` maps Markdown, JSON, TypeScript, shell, SQL, YAML, text,
  and unknown extensions correctly.
- URL builders produce local web URLs and deployed server-to-web URL mappings.
- argument parsing rejects unknown options and missing option values.
- read/write access option helpers reject conflicting flags.
- `requestJson` reports non-OK API errors without hiding status codes.

CLI child-process tests can come after library coverage.

### `packages/api`

Priority: low until API surface grows.

Backfill smoke contract tests for:

- `healthCheck` returns `OK`.
- `privateData` rejects a missing session.
- `privateData` returns the session user when called with a fake session
  context.

Use `appRouter.createCaller` rather than booting the full server.

### `packages/db`

Priority: medium before storage evolution.

Backfill schema/migration smoke tests for:

- Migrations create `workspaces`, `workspace_files`, `workspace_events`, and
  `workspace_file_versions`.
- Composite primary keys prevent duplicate current file rows and duplicate file
  versions.
- Cascading deletes remove workspace files, events, and file versions.
- Auth tables and workspace tables can coexist in the same local SQLite/D1
  schema.

### `packages/auth`

Priority: low until v2 identity work starts.

Do not deeply test Better Auth internals. Add tests around local configuration
only when token rotation, identity, or session UX work changes auth behavior.

### `packages/env`

Priority: low.

Add tests only for local env proxy behavior or validation boundaries if env
logic becomes more than a thin wrapper.

### `packages/infra`

Priority: low for unit tests, high for deploy smoke.

Keep Alchemy deploy proof as smoke evidence. Add static tests only for helper
logic like required-value validation or URL normalization if it is extracted.

### `packages/ui`

Priority: low until shared components gain domain behavior.

Rely on TypeScript and browser usage first. Add component tests only for
MDSync-specific behavior, accessibility regressions, or non-trivial state.

## Backfill Existing Done Work

Add one explicit done-work backfill task before broad implementation, for
example:

```txt
V1-009 Automated Regression Backfill
```

That task should cover:

- v0 backend substrate behavior currently proven by `scripts/smoke-backend.sh`.
- v0 optimistic mutation behavior.
- v0 upload/update script behavior.
- v0 browser workspace UI behavior.
- v1 protocol validator behavior beyond fixture happy paths.
- v1 HTTP conformance negative/profile behavior.
- v1 MDSync event and file-history profile behavior.
- v1 HA2HA docs site rendering and Worker fallback behavior.
- root workspace `test` scripts and Turbo test wiring.

The task should not change product behavior except where tests expose a real
bug.

## Update Ready Todo Tasks

Every ready task should require named tests before it can move to `done`.
Update task files in `docs/v2/tasks` and `docs/v3/tasks` with task-specific
test expectations.

### v2 Task Test Requirements

`V2-001 Changelog And Activity UI`:

- Integration tests for event listing/filtering/grouping over v1 event data.
- Playwright test for activity UI rendering file, actor, type, and time filters.
- Regression test that product-only activity presentation does not alter HA2HA
  event record shape.

`V2-002 File History Diff Restore UI`:

- Integration tests for version list and historical file reads.
- Unit tests for diff/restore planning if restore logic is extracted.
- Playwright test that restore creates a new current version and leaves history
  immutable.

`V2-003 Comments UI And Data`:

- Data/route tests for comments anchored to workspace, path, version, and
  optional selector.
- Tests for changed-file behavior so anchors do not silently move.
- Playwright test for create, list, resolve, and inspect comments.

`V2-004 Stats And Admin Surfaces`:

- Unit/integration tests for stats aggregation.
- Permission tests for admin-only actions once identity exists.
- Playwright smoke for admin visibility and empty/error states.

`V2-005 Token Rotation Identity Sessions`:

- Integration tests for read/edit token rotation and revocation.
- Tests proving old tokens fail and new tokens work.
- Tests or log assertions proving raw tokens are not stored in plaintext or
  emitted in logs/evidence.
- Session tests only for product behavior this task actually introduces.

`V2-006 Encryption UX Decision`:

- Docs-only task. Require a decision record and a follow-up test plan before
  implementation tasks are created.

`V2-007 Import Export Retention Storage Evolution`:

- Round-trip import/export fixture tests for canonical protocol paths,
  manifests, file contents, events, file history, comments, and evidence where
  available.
- Retention/cleanup integration tests for expired records and orphaned objects.
- Migration/storage tests before per-workspace D1 is pursued.

`V2-008 Team Workspace Product Pilot`:

- E2e pilot test or scripted dogfood run with one human reviewer and two agent
  contexts.
- Tests proving activity, history, comments, token/identity status, task state,
  and evidence are inspectable in the product UI.
- Evidence that the pilot uses v1 HA2HA skill workflows instead of
  product-private agent behavior.

`V2-010 MDSync Client SDK`:

- `pnpm --filter @mdsync/client test`.
- `node scripts/mdsync-client-package-smoke.mjs`.
- `npm pack --dry-run --json ./packages/mdsync-client`.
- `pnpm run check`.
- `pnpm run check-types`.
- `pnpm run test`.
- Tests proving hosted workspace create/import/export, versioned file writes,
  version conflicts, comments, history, events, capabilities, admin stats,
  retention, and `createHa2haClient()` behavior.

`V2-009 MDSync Installable Skill Package`:

- `pnpm --filter @mdsync/skills test`.
- `node scripts/mdsync-skill-package-smoke.mjs`.
- `npm pack --dry-run --json ./packages/mdsync-skills`.
- `pnpm run check`.
- `pnpm run check-types`.
- `pnpm run test`.
- Installed-skill smoke proving MDSync product boundary guidance, `@mdsync/client`
  usage, token rules, `baseVersion`, conflict stop rules, secret redaction, and
  absence of repo-local paths.

### v3 Task Test Requirements

`V3-001 Open Decisions To Decision Records`:

- Docs validation or search checks proving each open decision has owner,
  options, recommendation, accepted outcome or blocking state, and scope.

`V3-002 Coordination Profile`:

- Valid and invalid fixtures for claims, leases, handoffs, blockers,
  dependencies, acceptance criteria, questions, and approvals.
- Validator/conformance tests once profile schemas exist.

`V3-003 Trust And Delegation Profile`:

- Valid and invalid fixtures for principals, participants, roles, authority
  grants, delegation, and audit events.
- Negative tests proving secrets and raw tokens are rejected from manifests,
  logs, evidence, and audit events.

`V3-004 Evidence And Review Profile`:

- Valid and invalid fixtures for evidence, check results, review anchors,
  questions, responses, and approvals.
- Tests proving review anchors use stable workspace coordinates.

`V3-005 Engineering Profile`:

- Fixtures and tests for repository, branch, commit, issue, pull request, check,
  deployment, and code review references.
- Tests proving provider-specific payloads remain adapter-owned and do not leak
  into portable profile records.

`V3-006 Profile Conformance And Migration`:

- Conformance tests for independently claimed profiles.
- Migration fixture tests from v1/v2 data into claimed v3 profile records.

`V3-007 Engineering Team Collaboration Pilot`:

- E2e or dogfood test proving two independent agent contexts and one human
  reviewer can coordinate through one workspace.
- Tests or scripted checks proving task completion is blocked when required
  evidence, review, approval, or check state is missing, stale, or failing.

## Definition Of Done For Test Work

A test-backfill change is done only when:

- Tests are added at the package/app boundary that owns the behavior.
- The root test command includes the new tests, unless intentionally documented
  as slow/manual.
- Any ready task touched by the work names the required test path or command.
- Existing task evidence is not overwritten; new evidence is appended.
- No task is marked `done` solely because broad `check`, `check-types`, or
  `build` passed.
- The final verification command set includes:

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:integration
```

For browser or live server changes, also include the relevant e2e or
conformance command.

## Pursue Goal Prompt

Use this prompt to start the implementation run:

```text
Pursue this goal in /Users/pax/Documents/robosync:

Implement the MDSync testing strategy in TESTING_STRATEGY.md.

Scope:
- Add a root test gate and Turbo test wiring.
- Backfill relevant unit, integration, and e2e tests for existing done v0/v1 behavior across apps/server, apps/web, apps/ha2ha, packages/ha2ha-protocol, packages/ha2ha-http, scripts, packages/api, and packages/db.
- Add or update task docs so ready todo tasks explicitly require task-specific tests before moving to done.

Rules:
- Read AGENTS.md and TESTING_STRATEGY.md first.
- Preserve existing repo patterns and the current node:test plus tsx package-test style unless a specific app needs Playwright for browser proof.
- Do not rewrite implementation code just to make private internals testable. Prefer public behavior, route contracts, conformance checks, and extracted pure helpers where they reduce real complexity.
- Do not mark any task done unless the tests and evidence for that task are implemented.
- Keep docs authority boundaries intact: docs/README.md is navigation only, v0/v1/v2/v3 own their respective task and sprint surfaces.
- Do not overwrite existing evidence; append new evidence.
- If you discover a real behavior bug while adding tests, fix it narrowly and keep the test as regression coverage.

Preferred order:
1. Inspect current package scripts, existing tests, and dirty worktree.
2. Add root test scripts and Turbo test tasks.
3. Add fast package tests for protocol, conformance, server domain logic, scripts, API, and DB schema/migration behavior.
4. Add server route integration tests for workspace create/read/update/delete/events/history behavior.
5. Add Playwright e2e for the web create/read/edit/conflict flow and HA2HA docs site smoke/fallback behavior.
6. Update v2 and v3 ready task files with explicit test requirements.
7. Run pnpm run check, pnpm run check-types, pnpm run test, and relevant e2e/conformance commands.
8. Report changed files, tests added, commands run, and any remaining gaps.
```
