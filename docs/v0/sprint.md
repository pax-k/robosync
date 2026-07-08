# v0 Sprint: Foundation And Demo Implementation

## Goal

Ship MDSync v0 as a usable foundation/demo implementation: workspace create/read/update, D1/R2 storage, capability links, raw agent routes, browser preview/edit, upload/update scripts, smoke evidence, and deploy readiness.

## Current State

- Backend workspace substrate exists in `apps/server/src/workspaces/*`.
- D1 workspace tables exist in `packages/db/src/schema/workspaces.ts` and the first migration.
- R2 object handling, path normalization, capability-token checks, raw routes, and optimistic file mutations exist.
- Browser workspace UI exists in `apps/web/src/app.tsx`, but it still needs HA2HA naming cleanup and verification.
- Upload/update helper scripts are not present yet.
- Raw file responses and smoke checks still use `X-Robosync-*` headers.
- `pnpm run check` is currently red from existing non-doc Ultracite/Biome issues.

## Execution Order

1. Review and harden the implemented backend substrate.
2. Rename protocol-facing Robosync strings and headers to HA2HA.
3. Verify and polish the browser workspace UI.
4. Add upload/update scripts.
5. Fix check/type/build issues and capture smoke evidence.
6. Verify deploy readiness.

## Tasks

- [V0-001 Backend Workspace Substrate](tasks/V0-001-backend-workspace-substrate.md)
- [V0-002 Capability Access Model](tasks/V0-002-capability-access-model.md)
- [V0-003 Optimistic File Mutations](tasks/V0-003-optimistic-file-mutations.md)
- [V0-004 HA2HA Naming Cleanup](tasks/V0-004-ha2ha-naming-cleanup.md)
- [V0-005 Browser Workspace UI](tasks/V0-005-browser-workspace-ui.md)
- [V0-006 Upload Update Scripts](tasks/V0-006-upload-update-scripts.md)
- [V0-007 Verification And Ultracite Cleanup](tasks/V0-007-verification-and-ultracite-cleanup.md)
- [V0-008 v0 Deploy Readiness](tasks/V0-008-v0-deploy-readiness.md)

## Done Definition

- Browser and server support the v0 API and UX in [api-contract.md](api-contract.md).
- Protocol-facing raw listing and raw file headers use HA2HA names.
- Upload/update scripts can create and update workspaces locally.
- Backend smoke passes against a local server.
- `pnpm run check`, `pnpm run check-types`, and relevant build commands pass or have documented external blockers.
- Release evidence is attached to the v0 tasks before marking them `done`.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
scripts/smoke-backend.sh
```
