---
id: V1-008
title: Ship core HA2HA agent skill alpha
version: v1
state: ready
priority: medium
depends_on: [V1-001, V1-002, V1-003, V1-004]
area: agent-adoption
acceptance:
  - Skill alpha covers publish workspace, join/read workspace, update file with baseVersion, update STATUS.md, claim a task, add evidence, and handle conflicts.
  - Mutating workflows declare allowed workspace paths, token handling, conflict retry behavior, evidence output, and stop conditions.
  - At least one manual trial shows two separate agent contexts coordinating through the same workspace using v1 raw/API semantics.
  - The skill alpha does not claim v3 coordination, trust, evidence/review, or engineering profile conformance.
evidence: []
---

## Intent

Introduce HA2HA to agents as a repeatable workflow before the full
engineering-team product exists.

v1 should prove that agents can safely publish, read, update, claim, and write
evidence through a validated workspace substrate. It should not yet claim
hosted team governance or engineering-team collaboration.

## Current Evidence

- v0 upload/update scripts exist in `scripts/upload-file.mjs`,
  `scripts/upload-workspace.mjs`, and `scripts/update-file.mjs`.
- [../ha2ha-protocol.md](../ha2ha-protocol.md) defines the v1 protocol
  direction.
- [../../v2/product-use-cases.md](../../v2/product-use-cases.md) identifies
  agent skills as the adoption layer.
- [../../v3/open-discussions.md](../../v3/open-discussions.md) marks skills as
  a strong adoption path.

## Work

- Decide the first skill packaging format: Codex skill, generic instruction
  pack, npm package, or a combination.
- Define the skill trigger language and required reading order.
- Reuse or wrap the v0 scripts where they are sufficient.
- Add read/update behavior that requires `baseVersion` for mutating writes.
- Add task-claim and evidence-writing workflows against the v1 workspace
  convention.
- Document token handling and stop conditions.
- Run a manual trial with two separate agent contexts.

## Acceptance

- The alpha skill is protocol-aware and implementation-light.
- The alpha skill can be used against local MDSync without product-only v2
  features.
- A second write conflict stops and surfaces the conflict instead of silently
  retrying forever.
- Evidence from the manual trial identifies what was proven, simulated, and
  still unproven.

## Verification

```bash
rg -n "publish workspace|join workspace|baseVersion|add evidence|claim" docs scripts
pnpm run check
pnpm run check-types
```
