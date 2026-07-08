# HA2HA Protocol Examples

These fixtures are portable HA2HA v1 examples. They must not require MDSync
server, web, Cloudflare, D1, R2, Better Auth, Next.js, or Hono.

## Valid

- `valid/minimal-workspace`: core workspace convention, actor-attributed file
  write request, minimal task claim request, and minimal evidence metadata.
- `valid/multi-participant-task-workspace`: multiple participants coordinating
  through versioned task files.
- `valid/event-history-workspace`: declared event and file-history profile
  records for import/export preservation checks.

## Invalid

- `invalid/missing-manifest`: omits `.ha2ha/workspace.json`.
- `invalid/invalid-task-state`: uses a task state outside the v1 vocabulary.
- `invalid/invalid-evidence-metadata`: omits required evidence metadata.
- `invalid/invalid-target-coordinate`: uses a non-normalized target path and
  invalid version.
- `invalid/missing-actor-file-write`: omits the required mutating actor.
- `invalid/invalid-claim-metadata`: omits required claim `owner` and
  `updated_by`.
- `invalid/invalid-conflict-response`: omits the latest versioned target
  coordinate fields required by conflict responses.
