# v1: HA2HA Protocol

v1 is the full HA2HA protocol track. It turns the useful v0 MDSync substrate into an open protocol with normative workspace conventions, schemas, validation, examples, HTTP profile behavior, event/history profiles, and conformance checks.

HA2HA stands for Human-Agent to Human-Agent Protocol.

## Authority

v1 owns the protocol. It defines what any implementation must do to claim HA2HA support.

Implementation-specific infrastructure belongs outside normative protocol docs. MDSync appears here only as the first implementation and conformance target.

## Files

- [sprint.md](sprint.md)
- [tasks/](tasks/)
- [ha2ha-protocol.md](ha2ha-protocol.md)
- [protocol-adoption-and-ecosystem.md](protocol-adoption-and-ecosystem.md)
- [client-sdk.md](client-sdk.md)
- [workspace-conventions.md](workspace-conventions.md)
- [http-profile.md](http-profile.md)
- [task-claim-idempotency-and-races.md](task-claim-idempotency-and-races.md)
- [schemas-and-validation.md](schemas-and-validation.md)
- [conformance.md](conformance.md)
- [mdsync-conformance-plan.md](mdsync-conformance-plan.md)
- [mdsync-conformance.md](mdsync-conformance.md)
- [protocol-leak-review.md](protocol-leak-review.md)
- [skills/core-ha2ha-agent-alpha/SKILL.md](skills/core-ha2ha-agent-alpha/SKILL.md)
- [../../packages/ha2ha-skills/README.md](../../packages/ha2ha-skills/README.md)
- [../../packages/ha2ha-client/README.md](../../packages/ha2ha-client/README.md)
- [research/a2a-inspired-human-agent-sync.md](research/a2a-inspired-human-agent-sync.md)

## Required Protocol Surfaces

- `HA2HA.md`
- `.ha2ha/workspace.json`
- `participants/`
- `tasks/`
- `evidence/`
- `decisions/`
- `logs/`
- task states and frontmatter expectations
- conflict semantics
- file version semantics
- event/history protocol profiles
- `X-HA2HA-*` headers
- schemas, examples, validators, and conformance tests
- package readiness evidence before public registry claims
- installable HA2HA skill-package evidence before skill adoption claims
- HA2HA client SDK evidence for `@ha2ha/client` adoption claims
