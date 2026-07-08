---
id: V3-007
title: Run engineering team collaboration pilot
version: v3
state: ready
priority: high
depends_on: [V3-002, V3-003, V3-004, V3-005, V3-006, V3-009, V3-010, V1-008, V2-008]
area: product-protocol-pilot
acceptance:
  - Pilot workspace claims coordination, trust, evidence/review, and engineering profiles.
  - At least two independent agent contexts and one human reviewer coordinate through the same workspace.
  - Claims, handoffs, evidence, review comments, approvals, required checks, and engineering references are represented in portable workspace records.
  - Task completion is blocked when required evidence, review, approval, or check state is missing, stale, or failing.
  - Pilot evidence identifies launch blockers before an Engineering Team tier is marketed.
evidence: []
---

## Intent

Introduce the full engineering-team collaboration use case in v3, after the
portable profiles exist and can be validated.

This is the first point where MDSync can credibly claim an engineering-team
workflow: humans and separate agents coordinate software work through a shared,
versioned, inspectable workspace while Git, CI, issue tracking, chat, and
deployment systems remain external systems of action.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) defines the v3
  profile target.
- [../engineering-team-workflows.md](../engineering-team-workflows.md) describes
  the team workflow and v3 introduction point.
- [../agent-harness-integration-playbooks.md](../agent-harness-integration-playbooks.md)
  maps Codex, Claude Code, Cloudflare Agents SDK, Vercel eve, Vercel AI SDK,
  Mastra, and internal harnesses to integration modes.
- [../governance-audit-proof-of-work.md](../governance-audit-proof-of-work.md)
  defines the governance, audit, proof-of-work, and blind-spot direction.
- [../../v2/product-use-cases.md](../../v2/product-use-cases.md) defines the
  product ladder and says the full engineering-team use case belongs in v3.

## Work

- Select one pilot scenario: feature delivery, PR review memory, release
  readiness, incident response, or external collaboration.
- Create a v3 engineering workspace template with required profiles.
- Run the core skill workflows from separate agent contexts.
- Sync or record repository, branch, pull request, check, and deployment
  references without making HA2HA provider-specific.
- Exercise claim, lease, handoff, evidence, review, approval, and required-check
  gates.
- Record launch blockers and product gaps.

## Acceptance

- A human reviewer can inspect the workspace and determine current state,
  blockers, evidence, review status, required checks, and next action.
- A second agent can continue from a first agent's handoff without private chat
  history.
- The pilot preserves v1 file/version/conflict semantics.
- The pilot does not claim that HA2HA replaces Git, CI, issue tracking, chat, or
  deployment tools.

## Test Requirements

- Add an e2e or dogfood test proving two independent agent contexts and one human reviewer can coordinate through one workspace.
- Add tests or scripted checks proving task completion is blocked when required evidence, review, approval, or check state is missing, stale, or failing.
- Add conformance evidence proving the pilot preserves v1 file/version/conflict semantics while claiming v3 profiles.

## Verification

```bash
rg -n "engineering-team|claim|handoff|evidence|review|approval|check" docs/v3
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
```
