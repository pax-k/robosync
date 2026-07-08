# v2 Sprint: MDSync Product Features Beyond Protocol

## Goal

Build product experiences on top of v0 and v1: changelog, file history, diff/restore, comments, stats, admin, token/identity UX, encryption decisions, import/export, retention, and storage evolution.

## Current State

- v2 roadmap and product docs exist.
- v2 product features are not implemented.
- v1 event/history protocol data should exist before building related product UI.
- Comments, users, sessions, file locks, encryption UX, and per-workspace D1 remain product scope.

## Execution Order

1. Build changelog/activity and file-history UI over v1 protocol primitives.
2. Add diff/restore workflows.
3. Add comments and product data.
4. Add stats/admin surfaces.
5. Add token rotation, identity, and session UX as needed.
6. Decide encryption UX.
7. Add import/export, retention, and storage evolution.

## Tasks

- [V2-001 Changelog And Activity UI](tasks/V2-001-changelog-and-activity-ui.md)
- [V2-002 File History Diff Restore UI](tasks/V2-002-file-history-diff-restore-ui.md)
- [V2-003 Comments UI And Data](tasks/V2-003-comments-ui-and-data.md)
- [V2-004 Stats And Admin Surfaces](tasks/V2-004-stats-and-admin-surfaces.md)
- [V2-005 Token Rotation Identity Sessions](tasks/V2-005-token-rotation-identity-sessions.md)
- [V2-006 Encryption UX Decision](tasks/V2-006-encryption-ux-decision.md)
- [V2-007 Import Export Retention Storage Evolution](tasks/V2-007-import-export-retention-storage-evolution.md)

## Done Definition

- Product features do not redefine HA2HA protocol semantics.
- Event/history UI consumes v1 protocol data.
- Product-only tables and UX are documented as MDSync scope.
- Security and identity changes preserve least privilege and avoid leaking tokens.
- Product features have verification evidence before completion.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
