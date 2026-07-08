# Documentation Index

This directory is split by release horizon and authority.

## Tracks

- [v0](v0/README.md): MDSync foundations, infrastructure, demo web app, demo server app, and smoke checks.
- [v1](v1/README.md): the full HA2HA protocol, schemas, HTTP profile, examples, validators, and conformance plan.
- [v2](v2/README.md): MDSync product features that are useful but not part of the HA2HA protocol.
- [v3](v3/README.md): HA2HA as a broader human-agent collaboration standard for agentic work, including engineering.

## Authority Rules

- Root docs are navigation only. Do not add new root-level Markdown authority files under `docs/`.
- v0 documents what the first MDSync implementation ships and verifies.
- v1 documents HA2HA as a reusable open protocol.
- v2 documents MDSync product capabilities that may use HA2HA primitives but do not define the protocol.
- v3 documents future HA2HA protocol profiles needed for broad human-agent cooperation.

## Common Entry Points

- [v0 product scope](v0/product-scope.md)
- [v0 architecture](v0/architecture.md)
- [v0 API contract](v0/api-contract.md)
- [v0 sprint](v0/sprint.md)
- [v0 tasks](v0/tasks/)
- [v1 HA2HA protocol](v1/ha2ha-protocol.md)
- [v1 HTTP profile](v1/http-profile.md)
- [v1 conformance](v1/conformance.md)
- [v1 sprint](v1/sprint.md)
- [v1 tasks](v1/tasks/)
- [v2 product roadmap](v2/product-roadmap.md)
- [v2 product use cases](v2/product-use-cases.md)
- [v2 sprint](v2/sprint.md)
- [v2 tasks](v2/tasks/)
- [v3 collaboration protocol target](v3/collaboration-protocol.md)
- [v3 engineering team workflows](v3/engineering-team-workflows.md)
- [v3 sprint](v3/sprint.md)
- [v3 tasks](v3/tasks/)

## Execution Tracking

Each version directory owns a `sprint.md` file and a `tasks/` directory.

- `sprint.md` defines the current execution goal, state, task order, done definition, and verification commands.
- `tasks/*.md` defines one executable work item per file with shared frontmatter, acceptance criteria, and evidence placeholders.
- Task files are execution guidance until v1 validator work adds machine enforcement.
