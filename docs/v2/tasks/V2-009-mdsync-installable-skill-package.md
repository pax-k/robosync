---
id: V2-009
title: Package first-party MDSync installable skills
version: v2
state: ready
priority: high
depends_on: [V1-011, V2-005, V2-008]
area: agent-adoption
acceptance:
  - A dedicated MDSync skill package exists for hosted product workflows and is separate from the portable HA2HA protocol skill package.
  - The package location and distribution format are documented, such as `packages/mdsync-skills`, a top-level `skills/mdsync`, a Codex plugin bundle, npm tarball, or another installable skill registry format.
  - Skill workflows use `@mdsync/client` once the hosted product client SDK ships.
  - Skills can join or publish hosted MDSync workspaces, read raw/API state, update files with `baseVersion`, use product edit tokens or identity sessions safely, link users to dashboards, and write evidence.
  - Product-only workflows such as comments, activity/history inspection, token status, team-pilot onboarding, and provider sync are clearly marked MDSync scope and do not redefine HA2HA protocol semantics.
  - Mutating skills declare allowed paths, product routes, token or identity requirements, actor handle behavior, `baseVersion` handling, conflict retry limit, evidence output, secret redaction, and stop conditions.
  - Installation and update instructions are tested from outside the monorepo.
  - A dogfood trial shows the installed MDSync skill package operating against local or deployed MDSync without using repo-local script paths.
  - Public docs distinguish MDSync skill installation from HA2HA protocol skill installation.
evidence:
  - "2026-07-08: No dedicated `packages/mdsync-skills`, top-level installable `skills/mdsync`, or published MDSync skill package exists."
  - "2026-07-08: Current skill evidence is the repo-local v1 `docs/v1/skills/core-ha2ha-agent-alpha/SKILL.md`, which is protocol-aware and implementation-light."
  - "2026-07-08: V1-011 shipped `@ha2ha/skills` from `packages/ha2ha-skills`; MDSync product skills remain separate V2 work."
---

## Intent

Create an installable first-party MDSync skill package for users and agents who
adopt the hosted product rather than only the portable HA2HA protocol.

MDSync skills may know product-specific routes, dashboards, comments, history,
auth, token handling, and provider-sync affordances. Those behaviors should
accelerate product adoption without becoming protocol authority.

## Current Evidence

- [../product-use-cases.md](../product-use-cases.md) identifies agent skills as
  the adoption layer.
- [V2-008](V2-008-team-workspace-product-pilot.md) depends on v1 skill workflows
  for a team-workspace pilot.
- [../../v1/tasks/V1-011-ha2ha-installable-skill-package.md](../../v1/tasks/V1-011-ha2ha-installable-skill-package.md)
  shipped the protocol-only HA2HA skill package.
- [V2-010](V2-010-mdsync-client-sdk.md) tracks the hosted MDSync client SDK that
  product skills should call once it exists.
- There is no dedicated installable MDSync skill package as of 2026-07-08.
  MDSync skills should build on `@ha2ha/skills` for protocol workflows while
  keeping hosted routes, tokens, dashboards, comments, history, provider sync,
  and team-pilot onboarding product-specific.

## Work

- Choose the MDSync skill package location and distribution mechanism.
- Define the MDSync skill set separately from the portable HA2HA skill set.
- Add product-aware workflows for hosted workspace join/publish, raw/API reads,
  versioned writes, dashboard links, token/identity handling, comments/history
  inspection, and team-pilot onboarding.
- Decide which helper commands call `@ha2ha/skills`, `@ha2ha/client`, MDSync API
  routes, or future MDSync client packages.
- Add install, update, version, compatibility, and permission documentation.
- Run an installed-skill dogfood trial against local or deployed MDSync.

## Acceptance

- A user or agent can install the MDSync skill package without cloning this repo.
- The package documents every secret, token, identity, and product route it uses.
- The package never stores raw tokens, private credentials, or model-private
  reasoning in workspace evidence.
- The package states which workflows are product-specific and which rely on
  HA2HA protocol primitives.
- Team-pilot docs point to this package once it ships.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm run test
pnpm run test:e2e
```
