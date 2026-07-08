---
id: V0-007
title: Make verification green
version: v0
state: done
priority: high
depends_on: [V0-004, V0-005, V0-006]
area: quality
acceptance:
  - `pnpm run check` passes or all remaining failures are explicitly external to v0 release.
  - `pnpm run check-types` passes.
  - Relevant build commands pass.
  - Backend smoke evidence is attached.
evidence:
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run build passed with the known non-blocking cloudflare:workers tsdown external warning."
  - "2026-07-08: Local and deployed backend smoke passed."
---

## Intent

Turn v0 from implemented pieces into a verifiable release candidate.

## Current Evidence

- `pnpm run check` passes.
- `pnpm run check-types` passes.
- `pnpm run build` passes with the known non-blocking `cloudflare:workers` tsdown external warning.
- Consolidated v0 release evidence is recorded in [../sprint.md](../sprint.md).

## Work

- Fix formatting/lint issues that block `pnpm run check`.
- Run type checks and builds.
- Run backend smoke against a local server.
- Attach command output or evidence summaries to relevant tasks.

## Acceptance

- Verification commands are repeatable from a clean checkout after install.
- Failures, if any, are documented with exact command output and owner.
- No task is marked `done` without evidence.

## Completion Evidence

- `pnpm run check` passed.
- `pnpm run check-types` passed.
- `pnpm run build` passed.
- `scripts/smoke-backend.sh` passed locally; deployed smoke passed with `BASE_URL=https://mdsync-server-pax.pax.workers.dev`.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run build
scripts/smoke-backend.sh
```
