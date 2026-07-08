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
  - UX exposes workspace inventory, health, recent activity, conflicts, unresolved comments, task state, storage, retention, service accounts, and integrations.
  - Mutating controls are explicitly gated behind team roles and audit-event requirements.
  - Workspace drilldown preserves the existing workspace UI and admin panel.
evidence: []
---

# V4-003 Team Control Panel UX

## Intent

Create the product surface where team admins can see and manage work across
many workspaces.

## Work

- Design team overview.
- Design workspace inventory.
- Design cross-workspace activity and audit logs.
- Design health and next-required-action sections.
- Design service-account and integration status sections.
- Define which actions are read-only in v4.0.
- Define which future actions require audit events and stronger policy checks.

## Out Of Scope

- Character-level collaboration.
- Replacing Git, CI, issue trackers, chat, or deployment tools.
- Broad mutating admin actions before authorization and audit events are
  implemented.

## Verification

```bash
rg -n "control panel|workspace inventory|health|next required action|service account|integration" docs/v4
pnpm run check
```

