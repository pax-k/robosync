---
id: V0-005
title: Finish and verify browser workspace UI
version: v0
state: done
priority: high
depends_on: [V0-001, V0-002, V0-003, V0-004]
area: web
acceptance:
  - Browser can create a workspace and navigate to the returned workspace URL.
  - Browser can load workspace metadata, tree, file content, raw link, and edit state.
  - Save uses `baseVersion` and handles `409` by loading latest content.
  - UI copy uses MDSync/HA2HA naming and fits the v0 product scope.
evidence:
  - "2026-07-08: Local browser smoke created workspace wLBn_WfmXUWV, loaded file tree/raw link/editor, saved README.md to version 2, and reported no console errors or warnings."
  - "2026-07-08: Deployed browser smoke created workspace s0q26Vnws2Qt, loaded file tree/raw link/editor, saved README.md to version 2, and reported no console errors or warnings."
  - "2026-07-08: pnpm run build passed for the Vite React web app."
---

## Intent

Make the human browser/editor path usable enough for v0.

## Current Evidence

- `apps/web/src/app.tsx` exists and implements create, workspace tree, preview, edit, save, and conflict reload behavior.
- The app uses MDSync display/default copy.
- Local and deployed browser-run evidence is attached.

## Work

- Review the current UI against [../product-scope.md](../product-scope.md).
- Clean up naming and any obvious UX gaps.
- Verify create, read-only, edit, raw-link, refresh, and stale-save behavior in browser.
- Attach evidence before completion.

## Acceptance

- v0 browser workflows work against the local API.
- UI behavior matches capability tokens and optimistic concurrency rules.
- Browser evidence is attached before this task moves to done.

## Completion Evidence

- Local browser smoke: workspace `wLBn_WfmXUWV`, saved `README.md` to version 2, no console errors or warnings.
- Deployed browser smoke: workspace `s0q26Vnws2Qt`, saved `README.md` to version 2, no console errors or warnings.

## Verification

```bash
pnpm run dev
pnpm run check-types
pnpm run build
```
