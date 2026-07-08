---
id: V4-005
title: Define top-down work orchestration
version: v4
state: planned
priority: high
depends_on: [V4-001, V4-002, V4-003]
area: product-orchestration
acceptance:
  - Dashboard-created work is documented as durable work intent, not direct agent runtime control.
  - Board cards materialize to workspace task files before they are offered as portable HA2HA work.
  - Pull-mode agent inbox is defined as the first pickup surface.
  - Event-mode and hosted-runner modes are separated as later product slices.
  - Authorization, audit events, failure classes, and evidence requirements are documented.
evidence: []
---

# V4-005 Top-Down Work Orchestration

## Intent

Let humans create and govern work from MDSync first, then let agents pick up
eligible work through scoped product and HA2HA workflows.

## Context

- [../top-down-work-orchestration.md](../top-down-work-orchestration.md)
  defines the product direction.
- [../team-control-plane.md](../team-control-plane.md) defines team ownership,
  service accounts, audit events, and control-panel boundaries.
- [../product-data-model.md](../product-data-model.md) drafts the product data
  model.

## Work

- Define board, work-item, and card terminology.
- Define board-to-workspace materialization.
- Define agent inbox query and claim behavior.
- Define pull-mode skill flow for Codex, Claude Code, Cursor, and similar
  local agent surfaces.
- Define signed event-mode requirements for hosted agents and integrations.
- Define why hosted runner execution is a later slice.
- Define audit events for create, publish, claim, release, block, reassign,
  review, and close actions.
- Define failure classes agents can handle safely.

## Out Of Scope

- Launching arbitrary local agents from MDSync.
- Building a general-purpose queue protocol into HA2HA.
- Replacing Jira, Linear, GitHub Projects, CI, deployment, or chat.
- Hosted agent execution before sandboxing, credentials, billing,
  observability, and runtime isolation are designed.

## Verification

```bash
rg -n "top-down|board|agent inbox|pull mode|event mode|hosted runner|materialize" docs/v4
pnpm run check
```

