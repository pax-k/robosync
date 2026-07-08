# Documentation Index

This directory is split by release horizon and authority.

## Tracks

- [v0](v0/README.md): MDSync foundations, infrastructure, demo web app, demo server app, and smoke checks.
- [v1](v1/README.md): the full HA2HA protocol, schemas, HTTP profile, examples, validators, and conformance plan.
- [v2](v2/README.md): MDSync product features that are useful but not part of the HA2HA protocol.
- [v3](v3/README.md): HA2HA as a broader human-agent collaboration standard for agentic work, including engineering.
- [v4](v4/README.md): MDSync team, tenant, aggregate-admin, and control-plane product scope.

## Authority Rules

- Root docs are navigation only. Do not add new root-level Markdown authority files under `docs/`.
- v0 documents what the first MDSync implementation ships and verifies.
- v1 documents HA2HA as a reusable open protocol.
- v2 documents MDSync product capabilities that may use HA2HA primitives but do not define the protocol.
- v3 documents future HA2HA protocol profiles needed for broad human-agent cooperation.
- v4 documents MDSync hosted product control-plane capabilities above many workspaces.

## Common Entry Points

- [v0 product scope](v0/product-scope.md)
- [v0 architecture](v0/architecture.md)
- [v0 API contract](v0/api-contract.md)
- [v0 sprint](v0/sprint.md)
- [v0 tasks](v0/tasks/)
- [v1 HA2HA protocol](v1/ha2ha-protocol.md)
- [v1 protocol adoption and ecosystem](v1/protocol-adoption-and-ecosystem.md)
- [v1 HTTP profile](v1/http-profile.md)
- [v1 conformance](v1/conformance.md)
- [v1 protocol leak review](v1/protocol-leak-review.md)
- [v1 sprint](v1/sprint.md)
- [v1 tasks](v1/tasks/)
- [v2 product roadmap](v2/product-roadmap.md)
- [v2 product use cases](v2/product-use-cases.md)
- [v2 high-impact workflows](v2/high-impact-workflows.md)
- [v2 sprint](v2/sprint.md)
- [v2 tasks](v2/tasks/)
- [v3 collaboration protocol target](v3/collaboration-protocol.md)
- [v3 governance audit and proof of work](v3/governance-audit-proof-of-work.md)
- [v3 engineering team workflows](v3/engineering-team-workflows.md)
- [v3 agent harness integration playbooks](v3/agent-harness-integration-playbooks.md)
- [v3 sprint](v3/sprint.md)
- [v3 tasks](v3/tasks/)
- [v4 team control plane](v4/team-control-plane.md)
- [v4 top-down work orchestration](v4/top-down-work-orchestration.md)
- [v4 vertical room flows](v4/vertical-room-flows.md)
- [v4 product data model](v4/product-data-model.md)
- [v4 sprint](v4/sprint.md)
- [v4 tasks](v4/tasks/)

## Execution Tracking

Each version directory owns a `sprint.md` file and a `tasks/` directory.

- `sprint.md` defines the current execution goal, state, task order, done definition, and verification commands.
- `tasks/*.md` defines one executable work item per file with shared frontmatter, acceptance criteria, and evidence placeholders.
- Task files are execution guidance until v1 validator work adds machine enforcement.
