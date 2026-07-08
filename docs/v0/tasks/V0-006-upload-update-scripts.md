---
id: V0-006
title: Add upload and update scripts
version: v0
state: done
priority: high
depends_on: [V0-001, V0-002, V0-003, V0-004]
area: scripts
acceptance:
  - `scripts/upload-file.mjs` creates a one-file workspace.
  - `scripts/upload-workspace.mjs` uploads a directory while preserving relative paths.
  - `scripts/update-file.mjs` updates one file with `baseVersion` and `actor`.
  - Scripts read `MDSYNC_BASE_URL` and avoid printing edit tokens unless needed.
evidence:
  - "2026-07-08: MDSYNC_BASE_URL=http://localhost:3000 node scripts/upload-file.mjs README.md created workspace kL8JfjajAB_l."
  - "2026-07-08: MDSYNC_BASE_URL=http://localhost:3000 node scripts/upload-workspace.mjs docs/v0 --title 'v0 docs script smoke' created workspace Ak9BCHxa3NAm."
  - "2026-07-08: MDSYNC_BASE_URL=http://localhost:3000 node scripts/update-file.mjs kL8JfjajAB_l README.md README.md --token <redacted> --base-version 1 updated README.md to version 2."
  - "2026-07-08: Deployed script smoke created workspace TEGiOsOt3iTi and update-file printed raw listing, raw file, and edit links after updating README.md to version 2."
  - "2026-07-08 alignment: update-file now requires --actor or MDSYNC_ACTOR for actor attribution; earlier smoke evidence remains historical."
---

## Intent

Give agents a boring command-line path for publishing and updating v0 workspaces.

## Current Evidence

- `scripts/smoke-backend.sh` exists.
- Upload and update helper scripts exist.
- [../agent-skill-and-scripts.md](../agent-skill-and-scripts.md) defines the expected script shape.

## Work

- Implement the three required scripts.
- Preserve relative paths for workspace uploads.
- Use bearer authorization for update writes.
- Document usage in the relevant docs after scripts exist.

## Acceptance

- A local Markdown file can be uploaded and read through returned URLs.
- A local directory can be uploaded with path preservation.
- An existing file can be updated with version protection.

## Completion Evidence

- `scripts/upload-file.mjs` created workspace `kL8JfjajAB_l` from `README.md`.
- `scripts/upload-workspace.mjs` created workspace `Ak9BCHxa3NAm` from `docs/v0`.
- `scripts/update-file.mjs` updated `README.md` to version 2 with an explicit base version; current runs also require `--actor` or `MDSYNC_ACTOR`.
- Deployed script smoke created workspace `TEGiOsOt3iTi`; `scripts/update-file.mjs` updated `README.md` to version 2 and printed deploy-correct raw/edit links.

## Verification

```bash
MDSYNC_BASE_URL=http://localhost:3000 node scripts/upload-file.mjs README.md
MDSYNC_BASE_URL=http://localhost:3000 node scripts/upload-workspace.mjs docs/v0
MDSYNC_BASE_URL=http://localhost:3000 node scripts/update-file.mjs <workspace-id> README.md README.md --token <write-token> --base-version <version> --actor <actor>
```
