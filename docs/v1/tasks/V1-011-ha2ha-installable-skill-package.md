---
id: V1-011
title: Package first-party HA2HA installable skills
version: v1
state: ready
priority: high
depends_on: [V1-008, V1-010]
area: agent-adoption
acceptance:
  - A dedicated HA2HA skill package exists for protocol-only workflows and is not tied to MDSync product-only features.
  - The package location and distribution format are documented, such as `packages/ha2ha-skills`, a top-level `skills/ha2ha`, a Codex plugin bundle, npm tarball, or another installable skill registry format.
  - The package includes at least publish or join, read context, validate workspace, update file with `baseVersion`, claim task, add evidence, record decision, handoff, and conflict-stop workflows.
  - Mutating skills declare allowed paths, required token or identity scope, actor handle behavior, `baseVersion` handling, conflict retry limit, evidence output, and stop conditions.
  - Skills work in protocol mode against a local HA2HA folder or any conformant implementation; MDSync-specific dashboards, comments, hosted auth, and product routes stay out of this package.
  - Bundled scripts or command helpers are reviewed, small, permission-scoped, and versioned with the protocol packages they call.
  - Installation and update instructions are tested from outside the monorepo.
  - A dogfood trial shows an installed HA2HA skill package coordinating through a workspace without relying on repo-local paths.
evidence:
  - "2026-07-08: Current concrete skill artifact is repo-local only: `docs/v1/skills/core-ha2ha-agent-alpha/SKILL.md`."
  - "2026-07-08: No dedicated `packages/ha2ha-skills`, top-level installable `skills/ha2ha`, or published HA2HA skill package exists."
---

## Intent

Turn the repo-local core HA2HA skill alpha into an installable first-party skill
package that users and agents can adopt without cloning the MDSync repository.

This package should teach agents how to operate the portable HA2HA protocol. It
must not make MDSync product features a requirement for protocol adoption.

## Current Evidence

- [../skills/core-ha2ha-agent-alpha/SKILL.md](../skills/core-ha2ha-agent-alpha/SKILL.md)
  is the current alpha skill.
- [V1-008](V1-008-core-ha2ha-agent-skill-alpha.md) proved the core workflow as a
  repo-local Codex skill.
- [V1-010](V1-010-developer-package-adoption-readiness.md) tracks package
  readiness for protocol and HTTP tooling.
- There is no dedicated installable HA2HA skill package as of 2026-07-08.

## Work

- Choose the skill package location and distribution mechanism.
- Split protocol-only skill behavior from MDSync product-specific skill
  behavior.
- Convert the alpha skill into installable skill-package structure.
- Add install, update, version, and compatibility documentation.
- Add a minimal dogfood fixture and installed-skill trial.
- Decide whether helper scripts live inside the skill package or call published
  HA2HA CLI packages.

## Acceptance

- A user or agent can install the HA2HA skill package and use it against a local
  HA2HA workspace or conformant implementation.
- The package does not require MDSync accounts, dashboards, comments, product
  auth, or provider-sync adapters.
- The skill package states its maturity and supported HA2HA protocol version.
- Public docs stop pointing adopters at repo-local `docs/v1/skills/...` as the
  primary installation path once this package ships.

## Verification

```bash
pnpm run check
pnpm run check-types
pnpm --filter @mdsync/ha2ha-protocol test
pnpm --filter @mdsync/ha2ha-http test
```
