# v0 Sprint: Foundation And Demo Implementation

## Goal

Ship MDSync v0 as a usable foundation/demo implementation: workspace create/read/update, D1/R2 storage, capability links, raw agent routes, browser preview/edit, upload/update scripts, smoke evidence, and deploy readiness.

## Current State

- Backend workspace substrate is implemented in `apps/server/src/workspaces/*`.
- D1 workspace tables and the first migration are implemented in `packages/db`.
- R2 object handling, path normalization, capability-token checks, raw routes, and optimistic file mutations are implemented.
- Protocol-facing raw output uses HA2HA names: `# ha2ha workspace`, `X-HA2HA-File-Version`, and `X-HA2HA-Path`.
- Browser workspace UI is implemented in `apps/web/src/app.tsx`, branded as MDSync, and verified locally and after deploy.
- Upload/update helper scripts exist in `scripts/upload-file.mjs`, `scripts/upload-workspace.mjs`, and `scripts/update-file.mjs`.
- Verification is green for v0: `pnpm run check`, `pnpm run check-types`, `pnpm run build`, local smoke, and deployed smoke.
- Deployment is current:
  - Web: `https://mdsync-web-pax.pax.workers.dev`
  - Server: `https://mdsync-server-pax.pax.workers.dev`
- Known non-blocking warning: `pnpm run build` emits the existing `cloudflare:workers` tsdown external warning and exits successfully.

## Execution Order

1. Backend substrate reviewed and verified.
2. Protocol-facing raw strings and headers renamed to HA2HA.
3. Browser workspace UI verified locally and after deploy.
4. Upload/update scripts implemented and smoke-tested.
5. Check/type/build issues fixed and evidence captured.
6. Deploy readiness verified with deployed smoke and browser checks.

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

## Release Evidence

- `pnpm run check` passed on 2026-07-08.
- `pnpm run check-types` passed on 2026-07-08.
- `pnpm run build` passed on 2026-07-08 with the non-blocking `cloudflare:workers` external warning.
- `scripts/smoke-backend.sh` passed locally against `http://localhost:3000` for workspace `k0FA8EHF_BSj`.
- `BASE_URL="https://mdsync-server-pax.pax.workers.dev" scripts/smoke-backend.sh` passed for deployed workspace `QVfVtkfHvHF5`.
- Local script smoke created single-file workspace `kL8JfjajAB_l`, uploaded `docs/v0` as workspace `Ak9BCHxa3NAm`, and updated `README.md` from version 1 to 2.
- Deployed script smoke created workspace `TEGiOsOt3iTi`; `scripts/update-file.mjs` updated `README.md` to version 2 and printed raw listing, raw file, and edit links.
- Local browser smoke created workspace `wLBn_WfmXUWV`, saved `README.md` to version 2, and reported no console errors or warnings.
- `pnpm run deploy` completed on 2026-07-08 and published the web and server Workers listed above.
- Deployed browser smoke created workspace `s0q26Vnws2Qt`, loaded the file tree/raw link/editor, and saved `README.md` to version 2 without console errors or warnings.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
scripts/smoke-backend.sh
BASE_URL="https://mdsync-server-pax.pax.workers.dev" scripts/smoke-backend.sh
```
