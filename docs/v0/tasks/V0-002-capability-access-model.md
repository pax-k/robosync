---
id: V0-002
title: Review capability access model
version: v0
state: done
priority: high
depends_on: []
area: security
acceptance:
  - Read and write capability tokens are generated randomly and stored only as hashes.
  - Read access accepts read token or edit token according to v0 rules.
  - Write access accepts bearer edit token and browser edit query token.
evidence:
  - "2026-07-08: scripts/smoke-backend.sh passed locally and covered private read token, edit token read access, bearer write access, and read-only write rejection."
  - "2026-07-08: BASE_URL=https://sync-api.ha2ha.md scripts/smoke-backend.sh passed for workspace QVfVtkfHvHF5."
  - "2026-07-08: Browser edit link workflow saved workspace s0q26Vnws2Qt to README.md version 2 after deploy."
---

## Intent

Verify that v0 capability links are usable without introducing identity or user-session scope.

## Current Evidence

- `apps/server/src/workspaces/domain.ts` creates random workspace IDs and capability tokens.
- `apps/server/src/workspaces/routes.ts` implements read and write authorization.
- Create responses return share URLs but metadata responses omit raw tokens.
- Smoke covers token-protected read, edit-token read, bearer write, and read-only write rejection.

## Work

- Review public, token, and read-only workspace behavior.
- Confirm invalid and missing tokens return expected status codes.
- Confirm edit tokens can read token-protected workspaces.
- Attach smoke or focused curl output.

## Acceptance

- Capability behavior matches [../product-scope.md](../product-scope.md).
- No v0 task introduces users, sessions, identity, or per-file permissions.
- Token-handling evidence is attached before this task moves to done.

## Completion Evidence

- Local and deployed smoke passed capability-link checks.
- Deployed browser edit URL for workspace `s0q26Vnws2Qt` loaded and saved successfully.

## Verification

```bash
scripts/smoke-backend.sh
pnpm run check-types
```
