---
id: V0-008
title: Prove v0 deploy readiness
version: v0
state: done
priority: high
depends_on: [V0-005, V0-006, V0-007]
area: deploy
acceptance:
  - Local dev startup path is documented and verified.
  - Server deploy command is documented and verified where credentials allow.
  - Smoke can run against a deployed backend URL.
  - Release evidence records remaining known gaps.
evidence:
  - "2026-07-08: pnpm run deploy completed successfully."
  - "2026-07-08: Web deployment is available at https://sync.ha2ha.md."
  - "2026-07-08: Server deployment is available at https://sync-api.ha2ha.md."
  - "2026-07-08: BASE_URL=https://sync-api.ha2ha.md scripts/smoke-backend.sh passed for workspace QVfVtkfHvHF5."
  - "2026-07-08: Browser smoke against deployed web created workspace s0q26Vnws2Qt and saved README.md to version 2."
---

## Intent

Make v0 shippable by proving the local and deploy paths.

## Current Evidence

- `README.md` documents `pnpm run dev`, `pnpm run deploy`, and `pnpm run deploy:server`.
- [../backend-smoke.md](../backend-smoke.md) documents backend smoke usage.
- Final deploy-readiness evidence is attached.

## Work

- Verify local startup and backend smoke.
- Verify deploy commands when credentials are available.
- Record exact URLs, commands, and blockers in evidence.
- Confirm v0 exclusions remain excluded.

## Acceptance

- v0 has a clear release evidence trail.
- A future agent can reproduce the deploy/readiness check from docs.
- Any missing external credential or deployment proof is explicitly called out.

## Completion Evidence

- `pnpm run deploy` publishes the web Worker at `https://sync.ha2ha.md`.
- `pnpm run deploy` publishes the server Worker at `https://sync-api.ha2ha.md`.
- Deployed backend smoke passed.
- Deployed browser smoke loaded the workspace UI, file tree, raw link, editor, and saved a version bump.

## Verification

```bash
pnpm run dev
scripts/smoke-backend.sh
pnpm run deploy:server
BASE_URL="<server-url>" scripts/smoke-backend.sh
```
