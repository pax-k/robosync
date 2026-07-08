---
id: V2-008
title: Build team workspace product pilot
version: v2
state: ready
priority: medium
depends_on: [V2-001, V2-002, V2-003, V2-005, V1-008]
area: product-pilot
acceptance:
  - Product UI lets humans inspect shared workspace activity, history, comments, task state, evidence, and token or identity status needed for a limited team pilot.
  - Pilot uses the v1 core HA2HA skill alpha rather than product-private agent behavior.
  - Pilot supports a human plus at least two separate agent contexts handing off one workspace task.
  - Pilot explicitly lists gaps that remain before v3 engineering-team collaboration can launch.
evidence: []
---

## Intent

Introduce a limited hosted team-workspace pilot in v2 after the protocol and
core skill alpha exist.

This is not the full engineering-team product. It is a product UX proving step:
humans should be able to inspect, comment on, and govern a shared workspace
while agents continue to use the portable v1 workflow.

## Current Evidence

- [../product-roadmap.md](../product-roadmap.md) orders activity, history,
  comments, token rotation, identity, and import/export as v2 product work.
- [../product-use-cases.md](../product-use-cases.md) identifies hosted product
  UX as the bridge between v1 skills and v3 engineering-team collaboration.
- [../../v3/engineering-team-workflows.md](../../v3/engineering-team-workflows.md)
  defines the future team workflow target.

## Work

- Define the smallest team-workspace pilot scenario.
- Use v2 activity/history/comments/token/identity UX to expose agent-written
  workspace state to humans.
- Add onboarding copy or docs that explain which v1 skill workflows the pilot
  supports.
- Run a pilot with one human and two separate agent contexts.
- Capture missing v3 profile requirements as follow-up evidence.

## Acceptance

- The pilot stays product-scoped and does not redefine HA2HA protocol behavior.
- Human visibility is good enough to answer: what changed, who acted, what is
  blocked, what evidence exists, and what needs attention.
- The pilot records whether comments, identity, token controls, history, and
  evidence retention are sufficient for real team use.
- Remaining needs for claims, leases, trust/delegation, approvals, engineering
  references, and required checks are forwarded to v3.

## Verification

```bash
rg -n "team-workspace|activity|history|comments|identity|evidence" docs/v2 docs/v3
pnpm run check
pnpm run check-types
```
