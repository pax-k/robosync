---
id: V0-006
title: Add upload and update scripts
version: v0
state: ready
priority: high
depends_on: [V0-001, V0-002, V0-003, V0-004]
area: scripts
acceptance:
  - `scripts/upload-file.mjs` creates a one-file workspace.
  - `scripts/upload-workspace.mjs` uploads a directory while preserving relative paths.
  - `scripts/update-file.mjs` updates one file with `baseVersion`.
  - Scripts read `MDSYNC_BASE_URL` and avoid printing edit tokens unless needed.
evidence: []
---

## Intent

Give agents a boring command-line path for publishing and updating v0 workspaces.

## Current Evidence

- `scripts/smoke-backend.sh` exists.
- Upload and update helper scripts are not present.
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

## Verification

```bash
MDSYNC_BASE_URL=http://localhost:3000 node scripts/upload-file.mjs README.md
MDSYNC_BASE_URL=http://localhost:3000 node scripts/upload-workspace.mjs docs/v0
MDSYNC_BASE_URL=http://localhost:3000 node scripts/update-file.mjs <workspace-id> README.md README.md --token <write-token> --base-version <version>
```
