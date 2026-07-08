# v2 Sprint: MDSync Product Features Beyond Protocol

## Goal

Build product experiences on top of v0 and v1: changelog, file history, diff/restore, comments, stats, admin, token/identity UX, encryption decisions, import/export, retention, storage evolution, and installable MDSync agent skills.

## Current State

- v2 roadmap and product docs exist.
- V2-001 activity UI, V2-002 file history/diff/restore UI, V2-003
  comments UI/data, V2-004 stats/admin surfaces, V2-005 token rotation and
  revocation UX, V2-006 encryption UX decision, V2-007 import/export plus
  manual retention, and V2-008 limited team-workspace pilot are implemented.
- Per-workspace D1 remains deferred because current V2 import/export and
  retention evidence does not show an isolation or scale requirement. Users and
  sessions remain deferred until capability links no longer satisfy product
  needs.
- V2-008 used the repo-local v1 HA2HA alpha skill and keeps that historical
  evidence.
- `@ha2ha/skills` is now available as the installable, protocol-only v1 skill
  package. No dedicated MDSync installable skill package exists yet.
- `@ha2ha/client` is now available as the portable v1 protocol client. No
  `@mdsync/client` package exists yet; hosted product SDK behavior is planned
  but not shipped.

## Execution Order

1. Build changelog/activity and file-history UI over v1 protocol primitives.
2. Add diff/restore workflows.
3. Add comments and product data.
4. Add stats/admin surfaces.
5. Add token rotation, identity, and session UX as needed.
6. Decide encryption UX.
7. Add import/export, retention, and storage evolution.
8. Package a limited team-workspace product pilot over v1 skills and v2 UX.
9. Package first-party MDSync product skills for installation.
10. Document and ship the MDSync client SDK.

## Tasks

- [V2-001 Changelog And Activity UI](tasks/V2-001-changelog-and-activity-ui.md)
- [V2-002 File History Diff Restore UI](tasks/V2-002-file-history-diff-restore-ui.md)
- [V2-003 Comments UI And Data](tasks/V2-003-comments-ui-and-data.md)
- [V2-004 Stats And Admin Surfaces](tasks/V2-004-stats-and-admin-surfaces.md)
- [V2-005 Token Rotation Identity Sessions](tasks/V2-005-token-rotation-identity-sessions.md)
- [V2-006 Encryption UX Decision](tasks/V2-006-encryption-ux-decision.md)
- [V2-007 Import Export Retention Storage Evolution](tasks/V2-007-import-export-retention-storage-evolution.md)
- [V2-008 Team Workspace Product Pilot](tasks/V2-008-team-workspace-product-pilot.md)
- [V2-009 MDSync Installable Skill Package](tasks/V2-009-mdsync-installable-skill-package.md)
- [V2-010 MDSync Client SDK](tasks/V2-010-mdsync-client-sdk.md)

## Done Definition

- Product features do not redefine HA2HA protocol semantics.
- Event/history UI consumes v1 protocol data.
- Product-only tables and UX are documented as MDSync scope.
- Security and identity changes preserve least privilege and avoid leaking tokens.
- Product features have verification evidence before completion.
- The team-workspace pilot improves human visibility and governance, but does
  not claim full v3 engineering-team profile conformance.
- MDSync skill-package claims distinguish hosted product workflows from portable
  HA2HA protocol skills, should build on `@ha2ha/skills` where useful, and
  document token, identity, and product-route scope.
- MDSync client SDK claims distinguish hosted product integration from portable
  HA2HA protocol integration, should wrap `@ha2ha/client` one-way where useful,
  and include local or deployed dogfood evidence.

## Verification Commands

```bash
pnpm run check
pnpm run check-types
pnpm run build
```
