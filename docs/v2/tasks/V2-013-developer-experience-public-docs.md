---
id: V2-013
title: Ship MDSync developer experience and public documentation
version: v2
state: complete
priority: high
depends_on: [V2-009, V2-011, V2-012]
area: developer-adoption
acceptance:
  - The canonical MDSync Web origin serves a developer landing at /, guided creation at /new, addressable documentation under /docs, and unchanged workspace routes.
  - The landing explains agent publishing, URL joining, manual creation, HA2HA boundaries, capability security, and the working skills.sh installation path.
  - The HA2HA site links to GitHub, both skills, and MDSync without disabled placeholders or unavailable registry commands.
  - Public HA2HA guidance distinguishes supported Core 1.0 from draft extended collaboration profiles.
  - Public skills and package documentation use the canonical production links and do not claim unpublished npm packages are available.
  - Automated browser and static checks cover public routes, exact links, accessibility, mobile behavior, metadata, and capability redaction.
evidence:
  - "2026-07-14: Added the developer landing at /, retained guided creation at /new, and shipped addressable product documentation at /docs, /docs/getting-started, /docs/agent-handoff, and /docs/security."
  - "2026-07-14: Reworked the HA2HA public site around two valid adoption paths, exact GitHub and skills.sh links, supported Core 1.0 maturity, and draft extended collaboration profiles."
  - "2026-07-14: Aligned the public ha2ha and mdsync skills, URL-handoff reference, package READMEs, and package metadata with canonical production documentation while keeping npm distribution explicitly pending."
  - "2026-07-14: Green local proof: public-skill enforcement 6/6, HA2HA 3/3, Web 20/20, Playwright 15/15 with Axe and visual baselines, Ultracite, repository checks, type checks, and production builds."
  - "2026-07-14: Deployed Web, HA2HA, and API Workers through Alchemy; all landing, creation, documentation, protocol, and skills.sh routes returned HTTP 200 and both discovery endpoints agreed on canonical origins."
  - "2026-07-14: Production URL handoff passed with Viewer read access, Collaborator edit access, comment creation and resolution, protocol-only raw events, version_conflict preservation, and capabilityLeak false."
  - "2026-07-15: Renamed the public source repository to pax-k/ha2ha-mdsync and updated GitHub, skills.sh, package metadata, documentation, application content, tests, and installation commands to the new canonical slug."
---

# V2-013 MDSync Developer Experience And Public Documentation

## Intent

Make the public protocol, hosted product, repository, and skills read as one
coherent developer journey: install a skill, publish or join work, hand off a
scoped capability URL, and coordinate through durable HA2HA records.

## Product Boundary

- `apps/web` owns the MDSync landing, documentation, creation flow, and
  workspace application on one canonical origin.
- `apps/ha2ha` owns the portable protocol presentation and points to MDSync only
  as one hosted implementation.
- Skills.sh and GitHub are the supported public distribution paths until npm
  publication succeeds.
- This task adds no API, storage, discovery, capability, or protocol schema.

## Routes

- `/`: developer landing.
- `/new`: guided browser creation.
- `/docs`: documentation index and product/protocol boundary.
- `/docs/getting-started`: install, publish, create, and join.
- `/docs/agent-handoff`: Viewer/Collaborator coordination and conflicts.
- `/docs/security`: capability handling, redaction, rotation, and revocation.
- `/w/:id/*`: existing workspace behavior.

## Verification

```bash
pnpm dlx ultracite fix
pnpm run test:public-skills
pnpm --filter ha2ha test
pnpm --filter web test
pnpm run test:e2e
pnpm run check
pnpm run check-types
pnpm run build
```
