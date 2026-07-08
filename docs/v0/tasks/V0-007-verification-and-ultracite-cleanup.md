---
id: V0-007
title: Make verification green
version: v0
state: ready
priority: high
depends_on: [V0-004, V0-005, V0-006]
area: quality
acceptance:
  - `pnpm run check` passes or all remaining failures are explicitly external to v0 release.
  - `pnpm run check-types` passes.
  - Relevant build commands pass.
  - Backend smoke evidence is attached.
evidence: []
---

## Intent

Turn v0 from implemented pieces into a verifiable release candidate.

## Current Evidence

- `pnpm run check` currently fails on non-doc Ultracite/Biome issues in app/config/package files.
- Docs-targeted Ultracite previously checked zero Markdown files.
- No consolidated v0 release evidence file exists yet.

## Work

- Fix formatting/lint issues that block `pnpm run check`.
- Run type checks and builds.
- Run backend smoke against a local server.
- Attach command output or evidence summaries to relevant tasks.

## Acceptance

- Verification commands are repeatable from a clean checkout after install.
- Failures, if any, are documented with exact command output and owner.
- No task is marked `done` without evidence.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
scripts/smoke-backend.sh
```
