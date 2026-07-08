---
id: V0-002
title: Review capability access model
version: v0
state: review
priority: high
depends_on: []
area: security
acceptance:
  - Read and write capability tokens are generated randomly and stored only as hashes.
  - Read access accepts read token or edit token according to v0 rules.
  - Write access accepts bearer edit token and browser edit query token.
evidence: []
---

## Intent

Verify that v0 capability links are usable without introducing identity or user-session scope.

## Current Evidence

- `apps/server/src/workspaces/domain.ts` creates random workspace IDs and capability tokens.
- `apps/server/src/workspaces/routes.ts` implements read and write authorization.
- Create responses return share URLs but metadata responses omit raw tokens.

## Work

- Review public, token, and read-only workspace behavior.
- Confirm invalid and missing tokens return expected status codes.
- Confirm edit tokens can read token-protected workspaces.
- Attach smoke or focused curl output.

## Acceptance

- Capability behavior matches [../product-scope.md](../product-scope.md).
- No v0 task introduces users, sessions, identity, or per-file permissions.
- Token-handling evidence is attached before this task moves to done.

## Verification

```bash
scripts/smoke-backend.sh
pnpm run check-types
```
