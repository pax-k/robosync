---
id: V2-005
title: Add token rotation identity and sessions
version: v2
state: done
priority: high
depends_on: [V2-004]
area: security
acceptance:
  - Token rotation and revocation UX exists for read and edit capabilities.
  - User/session UX is added only for product needs capability links cannot satisfy.
  - Raw tokens are never stored in plaintext or leaked in logs/evidence.
evidence:
  - "2026-07-08: Added write-capability-gated GET /api/workspaces/:workspaceId/capabilities status route that reports read/edit access state without returning raw tokens."
  - "2026-07-08: Added POST /api/workspaces/:workspaceId/capabilities/read/rotate and /edit/rotate to regenerate read/edit capability links while storing only token hashes."
  - "2026-07-08: Added POST /api/workspaces/:workspaceId/capabilities/read/revoke and /edit/revoke; read revocation clears the read-token hash, and edit revocation sets write_access to none."
  - "2026-07-08: Added route regression coverage proving old read/edit tokens fail after rotation, new tokens work, revoked read tokens fail, revoked edit writes fail, and persisted token hashes do not equal raw rotated tokens."
  - "2026-07-08: Added Admin capability UX in apps/web/src/app.tsx for read/edit status, rotation, revocation, and post-rotation session update without rendering token strings as visible text."
  - "2026-07-08: Added Playwright coverage for capability status, read rotation, edit rotation, read revocation, and admin error rendering."
  - "2026-07-08: Updated docs/v2/security-and-identity.md to document capability routes, one-time rotation URLs, no-token status payloads, and the decision to defer users/sessions."
  - "2026-07-08: pnpm --filter server test passed."
  - "2026-07-08: pnpm --filter web test passed."
  - "2026-07-08: pnpm run fix && pnpm run check passed."
  - "2026-07-08: pnpm run check passed."
  - "2026-07-08: pnpm run check-types passed."
  - "2026-07-08: pnpm run test passed."
  - "2026-07-08: pnpm run test:e2e passed."
  - "2026-07-08: pnpm run build passed."
---

## Intent

Mature access control while preserving v0 capability-link simplicity where it still works.

## Current Evidence

- v0 stores token hashes.
- [../security-and-identity.md](../security-and-identity.md) defines product identity and token maturity.
- V2 capability links still satisfy current product access needs; users and
  sessions remain deferred for ownership, billing, team administration, private
  dashboards, and durable audit identity.

## Work

- Add token rotation and revocation flows.
- Add identity/session surfaces when needed for ownership, comments, admin, or billing.
- Audit logs and evidence for sensitive actions must not expose secrets.

## Acceptance

- Users can rotate and revoke capabilities safely.
- Identity is product scope unless a future protocol version standardizes it.

## Test Requirements

- Add integration tests for read and edit token rotation and revocation.
- Add regression tests proving old tokens fail and new tokens work after rotation.
- Add assertions or log/evidence checks proving raw tokens are not stored in plaintext or emitted in logs/evidence.
- Add session tests only for product behavior introduced by this task.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
pnpm run build
```
