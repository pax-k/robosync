---
id: V2-008
title: Build team workspace product pilot
version: v2
state: done
priority: medium
depends_on: [V2-001, V2-002, V2-003, V2-004, V2-005, V2-007, V1-008]
area: product-pilot
acceptance:
  - Product UI lets humans inspect shared workspace activity, history, comments, task state, evidence, and token or identity status needed for a limited team pilot.
  - Pilot uses the v1 core HA2HA skill alpha rather than product-private agent behavior.
  - Pilot supports a human plus at least two separate agent contexts handing off one workspace task.
  - Pilot explicitly lists gaps that remain before v3 engineering-team collaboration can launch.
  - Pilot distinguishes use of repo-local alpha skills from installable HA2HA or MDSync skill packages.
evidence:
  - Added `docs/v2/team-workspace-pilot.md` with the limited pilot scenario,
    repo-local v1 alpha skill dependency, product visibility proof, installable
    skill-package distinction, and remaining v3 gaps.
  - V2-008 intentionally uses `docs/v1/skills/core-ha2ha-agent-alpha/SKILL.md`
    and V1-008 evidence; V1-011 installable HA2HA skill packaging and V2-009
    MDSync product skill packaging remain separate ready tasks.
  - Added Playwright coverage in `tests/e2e/web-workspace.spec.ts` under
    `web app exposes a limited team workspace pilot across agents and human
    review`.
  - Pilot test proves human inspection of activity from `agent-context-a` and
    `agent-context-b`, history, version-anchored comments, admin task state,
    evidence-file access, and read/edit capability status.
  - Verification passed: `rg -n
    "team-workspace|activity|history|comments|identity|evidence" docs/v2
    docs/v3`, `pnpm run fix`, `pnpm run check`, `pnpm run check-types`,
    `pnpm run test`, `pnpm run test:e2e`, `pnpm run build`.
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
- Record whether the pilot uses the repo-local v1 alpha, the installable HA2HA
  skill package, or the MDSync product skill package.
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

## Test Requirements

- Add an e2e pilot test or scripted dogfood run with one human reviewer and two separate agent contexts.
- Add tests proving activity, history, comments, token or identity status, task state, and evidence are inspectable in the product UI.
- Add evidence proving the pilot uses v1 HA2HA skill workflows instead of product-private agent behavior.

## Verification

```bash
rg -n "team-workspace|activity|history|comments|identity|evidence" docs/v2 docs/v3
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
```
