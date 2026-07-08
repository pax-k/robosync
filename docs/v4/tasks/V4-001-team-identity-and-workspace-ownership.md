---
id: V4-001
title: Define team identity and workspace ownership
version: v4
state: planned
priority: high
depends_on: []
area: product-identity
acceptance:
  - Team and tenant terminology is documented.
  - New hosted workspaces have a clear team ownership rule.
  - Personal teams are defined for solo users.
  - Legacy capability-link workspaces keep working.
  - Team membership roles are scoped to product routes and do not redefine HA2HA protocol identity.
evidence: []
---

# V4-001 Team Identity And Workspace Ownership

## Intent

Introduce the MDSync team as the product owner of many workspaces.

## Context

- [../team-control-plane.md](../team-control-plane.md) defines the control-plane
  boundary.
- [../product-data-model.md](../product-data-model.md) drafts `teams`,
  `team_members`, and workspace ownership fields.

## Work

- Add `teams` and `team_members` schema direction.
- Define owner, admin, member, viewer, and service-account roles.
- Define auto-created personal teams for new signed-in users.
- Define how new workspaces receive a `team_id`.
- Define how existing workspaces remain `legacy_link` until imported.
- Specify product route authorization against team membership.

## Out Of Scope

- Portable HA2HA trust-profile semantics.
- Enterprise account hierarchy above teams.
- Provider-specific identity mapping.

## Verification

```bash
rg -n "team|tenant|membership|personal team|legacy_link|ownership" docs/v4
pnpm run check
```

