---
id: V4-003
title: Design team control panel UX
version: v4
state: planned
priority: medium
depends_on: [V4-001, V4-002]
area: product-ux
acceptance:
  - Control panel starts as a read-mostly operational surface.
  - UX exposes workspace inventory, boards, agent inbox state, health, recent activity, conflicts, unresolved comments, task state, storage, retention, service accounts, and integrations.
  - Mutating controls are explicitly gated behind team roles and audit-event requirements.
  - Workspace drilldown preserves stable workspace routes, capability contracts, addressable inspectors, optimistic concurrency, and user-visible behavior without freezing the exact v2 UI.
evidence: []
---

# V4-003 Team Control Panel UX

## Intent

Create the product surface where team admins can see and manage work across
many workspaces.

## Work

- Design team overview.
- Design workspace inventory.
- Design board and work-item entry points.
- Design agent inbox visibility.
- Design cross-workspace activity and audit logs.
- Design health and next-required-action sections.
- Design service-account and integration status sections.
- Define which actions are read-only in v4.0.
- Define which future actions require audit events and stronger policy checks.
- Reuse the V2-011 shell and information architecture where they fit the team
  context, while allowing the visual composition to evolve.

## Compatibility Boundary

The team control panel must preserve stable workspace routes, `k` and `edit`
capability behavior, comments/history deep links, optimistic conflict handling,
read-versus-edit authorization, and the V2-012 URL discovery/bootstrap contract.
It may redesign navigation, cards, density, or the admin composition; V2-011
and V2-012 are behavioral foundations rather than pixel-level compatibility
promises.

## Out Of Scope

- Character-level collaboration.
- Replacing Git, CI, issue trackers, chat, or deployment tools.
- Broad mutating admin actions before authorization and audit events are
  implemented.

## Verification

```bash
rg -n "control panel|workspace inventory|board|agent inbox|health|next required action|service account|integration" docs/v4
pnpm run check
```
