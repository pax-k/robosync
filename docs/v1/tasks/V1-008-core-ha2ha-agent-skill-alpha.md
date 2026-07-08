---
id: V1-008
title: Ship core HA2HA agent skill alpha
version: v1
state: done
priority: medium
depends_on: [V1-001, V1-002, V1-003, V1-004, V1-005, V1-007]
area: agent-adoption
acceptance:
  - Skill alpha covers publish workspace, join/read workspace, update file with baseVersion, update STATUS.md, claim a task, add evidence, and handle conflicts.
  - Mutating workflows declare allowed workspace paths, token or identity scope, actor handle, baseVersion behavior, conflict retry behavior, evidence output, and stop conditions.
  - Task claim workflow sets `state`, `owner`, and `updated_by` through a versioned task-file update.
  - Evidence workflow writes minimal metadata: linked task or target, kind, result, actor, and timestamp.
  - At least one manual trial shows two separate agent contexts coordinating through the same workspace using v1 raw/API semantics.
  - The skill alpha does not claim v3 coordination, trust, evidence/review, or engineering profile conformance.
evidence:
  - "Added repo-local Codex skill package at `docs/v1/skills/core-ha2ha-agent-alpha/SKILL.md` with `agents/openai.yaml` metadata."
  - "Skill alpha covers publish workspace, join workspace, versioned file updates, `STATUS.md` updates, task claims, evidence writing, and conflict handling without claiming v3 coordination/trust/evidence-review/engineering profiles."
  - "Mutating workflows declare allowed paths, token/write scope, actor handles, `baseVersion` behavior, retry-once conflict handling, evidence output, and stop conditions."
  - "Manual local trial evidence saved at `docs/v1/evidence/core-ha2ha-agent-alpha-trial-2026-07-08.json` and summarized in `docs/v1/evidence/core-ha2ha-agent-alpha-trial-2026-07-08.md`."
  - "Trial used workspace `8aexIZ0gscbw` on `http://localhost:3000` with actors `agent-context-a` and `agent-context-b`; it proved publish, join/read, task claim, evidence add/link, `STATUS.md` update, first conflict surfacing, and second-conflict stop behavior."
  - "`python3 /Users/pax/.codex/skills/.system/skill-creator/scripts/init_skill.py core-ha2ha-agent-alpha --path docs/v1/skills ...` created the initial skill scaffold."
  - "`python3 /Users/pax/.codex/skills/.system/skill-creator/scripts/quick_validate.py docs/v1/skills/core-ha2ha-agent-alpha` passed with a temporary YAML shim because PyYAML was not available in the local Python runtime."
  - "`rg -n \"publish workspace|join workspace|baseVersion|add evidence|claim\" docs scripts` passed on 2026-07-08."
  - "`pnpm run check` passed on 2026-07-08."
  - "`pnpm run check-types` passed on 2026-07-08."
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
- Document actor handling, token handling, allowed paths, and stop conditions.
- Run a manual trial with two separate agent contexts.

## Acceptance

- The alpha skill is protocol-aware and implementation-light.
- The alpha skill can be used against local MDSync without product-only v2
  features.
- A second write conflict stops and surfaces the conflict instead of silently
  retrying forever.
- Skill output does not rely on MDSync product comments, identity UX, v3
  leases, approvals, structured review, checks, or engineering references.
- Evidence from the manual trial identifies what was proven, simulated, and
  still unproven.

## Verification

```bash
rg -n "publish workspace|join workspace|baseVersion|add evidence|claim" docs scripts
pnpm run check
pnpm run check-types
```
