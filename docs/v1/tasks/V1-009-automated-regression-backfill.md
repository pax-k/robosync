---
id: V1-009
title: Backfill automated regression tests
version: v1
state: done
priority: high
depends_on: [V0-008, V1-008]
area: quality
acceptance:
  - Root `pnpm run test` runs committed automated tests across packages and apps.
  - Existing v0 backend, script, browser, and v1 protocol/conformance behavior has regression coverage at the right layer.
  - Browser e2e tests cover the MDSync workspace flow and HA2HA docs site smoke path.
  - Ready v2 and v3 todo tasks explicitly require task-specific tests before moving to `done`.
  - Remaining live-server conformance evidence is documented separately from committed deterministic tests.
evidence:
  - "2026-07-08: Added root `pnpm run test`, `pnpm run test:unit`, `pnpm run test:integration`, and `pnpm run test:e2e` gates with Turbo test tasks."
  - "2026-07-08: Added package/app test scripts for `apps/server`, `apps/web`, `apps/ha2ha`, `packages/api`, `packages/db`, `packages/ha2ha-protocol`, and `packages/ha2ha-http`."
  - "2026-07-08: Backfilled unit and contract tests for workspace domain helpers, upload/script helpers, HA2HA protocol validation, HA2HA HTTP conformance failures, API routers, DB migrations/schema behavior, and static worker fallback behavior."
  - "2026-07-08: Added deterministic server route integration coverage for workspace create, read, raw read, update, stale conflict, file history, event listing, delete, and invalid-path rejection with in-memory D1/R2 fakes."
  - "2026-07-08: Added Playwright e2e coverage for the web workspace create/read/link/save flow, read-token workspaces without edit controls, stale-conflict refresh behavior, and HA2HA docs direct-route fallback."
  - "2026-07-08: Updated ready v2 and v3 task docs so task-specific automated tests are required before moving those tasks to `done`."
  - "2026-07-08: `pnpm run check`, `pnpm run check-types`, `pnpm run test`, `pnpm run test:integration`, `pnpm run build`, and `pnpm run test:e2e` passed."
  - "2026-07-08: Live deployed HA2HA conformance remains external proof; committed regression coverage now uses deterministic package, route, and browser tests."
  - "2026-07-08: `pnpm run deploy` completed and published web `https://mdsync-web-pax.pax.workers.dev`, HA2HA docs `https://mdsync-ha2ha-pax.pax.workers.dev`, and server `https://mdsync-server-pax.pax.workers.dev`."
  - "2026-07-08: Deployed backend smoke passed with `BASE_URL=https://mdsync-server-pax.pax.workers.dev scripts/smoke-backend.sh` for workspace `PJFn-fdZgjYE`."
  - "2026-07-08: Deployed HA2HA conformance passed 17/17 checks against `https://mdsync-server-pax.pax.workers.dev` at `2026-07-08T19:26:48.752Z`."
  - "2026-07-08: Deployed browser smoke created workspace `iXViQQdftvjR` at `https://mdsync-web-pax.pax.workers.dev` and saved `README.md` to version 2; deployed raw response returned `X-HA2HA-File-Version: 2`."
---

## Intent

Turn the smoke and manual evidence from v0/v1 into a repeatable automated test
gate before v2/v3 product and protocol work adds more surface area.

## Current Evidence

- [../../../TESTING_STRATEGY.md](../../../TESTING_STRATEGY.md) defines the
  test backfill strategy.
- Committed tests cover HA2HA protocol validator fixtures and HTTP conformance
  success/failure profiles.
- v0 backend, browser, and script behavior now has committed regression
  coverage across package tests, route integration tests, and Playwright e2e.

## Work

- Add root and Turbo test wiring.
- Add package-level unit and contract tests.
- Add deterministic browser e2e tests for MDSync and HA2HA docs.
- Update ready task docs with required tests.
- Add a deterministic server route integration harness for workspace routes,
  D1 persistence, R2 object behavior, events, and file history.
- Keep live MDSync conformance as external deployment proof, separate from the
  committed deterministic test gate.

## Acceptance

- Fast tests run with `pnpm run test`.
- Browser e2e tests run with `pnpm run test:e2e`.
- Existing done behavior has stronger regression coverage without changing
  product behavior.
- Live deployment conformance remains a separate external proof command.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:integration
pnpm run build
pnpm run test:e2e
HA2HA_BASE_URL=http://localhost:3000 pnpm --filter @mdsync/ha2ha-http conformance
```
