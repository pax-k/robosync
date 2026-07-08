---
id: V1-006
title: Build HA2HA protocol docs site
version: v1
state: done
priority: medium
depends_on: [V1-001, V1-002, V1-003, V1-004]
area: docs-site
acceptance:
  - `apps/ha2ha` explains HA2HA independently from MDSync.
  - Site links to schemas, examples, validator usage, and conformance instructions.
  - MDSync is presented only as the first implementation.
evidence:
  - "Added `apps/ha2ha` Vite/React docs site that explains HA2HA independently from MDSync and imports protocol constants from `@mdsync/ha2ha-protocol`."
  - "Published workspace convention, HTTP routes/headers, schemas, examples, validator usage, conformance profiles, capabilities, and task states in the docs UI."
  - "Added `apps/ha2ha/public/favicon.svg` and linked it from `apps/ha2ha/index.html`; browser console check reports no errors or warnings."
  - "`pnpm --filter ha2ha build` passed on 2026-07-08."
  - "`pnpm run check-types` passed on 2026-07-08."
  - "`pnpm run check` passed on 2026-07-08."
  - "Playwright screenshots captured after local dev-server QA: `output/playwright/ha2ha-desktop-1440.png` and `output/playwright/ha2ha-mobile-390.png`."
  - "`apps/ha2ha` was wired into `packages/infra/alchemy.run.ts` as a Cloudflare Vite deployment target on 2026-07-08 and deployed to `https://mdsync-ha2ha-pax.pax.workers.dev`."
---

## Intent

Create the public protocol home for HA2HA.

## Current Evidence

- `apps/ha2ha` does not exist.
- [../README.md](../README.md) identifies the protocol docs that need publication.

## Work

- Add the docs site app.
- Publish the core protocol, workspace convention, HTTP profile, schemas, examples, and conformance instructions.
- Keep implementation-provider details non-normative.

## Acceptance

- The site builds locally.
- Protocol docs remain understandable without running MDSync.

## Verification

```bash
pnpm run build
pnpm run check
```
