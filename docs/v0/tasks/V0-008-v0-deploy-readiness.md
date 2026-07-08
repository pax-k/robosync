---
id: V0-008
title: Prove v0 deploy readiness
version: v0
state: ready
priority: high
depends_on: [V0-005, V0-006, V0-007]
area: deploy
acceptance:
  - Local dev startup path is documented and verified.
  - Server deploy command is documented and verified where credentials allow.
  - Smoke can run against a deployed backend URL.
  - Release evidence records remaining known gaps.
evidence: []
---

## Intent

Make v0 shippable by proving the local and deploy paths.

## Current Evidence

- `README.md` documents `pnpm run dev`, `pnpm run deploy`, and `pnpm run deploy:server`.
- [../backend-smoke.md](../backend-smoke.md) documents backend smoke usage.
- No final deploy-readiness evidence is attached.

## Work

- Verify local startup and backend smoke.
- Verify deploy commands when credentials are available.
- Record exact URLs, commands, and blockers in evidence.
- Confirm v0 exclusions remain excluded.

## Acceptance

- v0 has a clear release evidence trail.
- A future agent can reproduce the deploy/readiness check from docs.
- Any missing external credential or deployment proof is explicitly called out.

## Verification

```bash
pnpm run dev
scripts/smoke-backend.sh
pnpm run deploy:server
BASE_URL="<server-url>" scripts/smoke-backend.sh
```
