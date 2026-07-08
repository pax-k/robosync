# v3: HA2HA Collaboration Standard

v3 is the future HA2HA protocol track for humans cooperating through agents
across general agentic work, including software engineering.

v1 defines the shared workspace substrate: files, versions, conflicts,
canonical paths, events, history, schemas, and conformance. v2 defines MDSync
product experiences over those primitives.

v3 asks a larger question:

```txt
Is HA2HA enough for humans to delegate, review, approve, and complete work
through separate agents?
```

The current answer is: v1 is enough for inspectable file synchronization, but
not enough for broad collaboration. v3 adds the missing protocol profiles.

## Files

- [sprint.md](sprint.md)
- [tasks/](tasks/)
- [collaboration-protocol.md](collaboration-protocol.md)
- [transport-validation-methods.md](transport-validation-methods.md)
- [governance-audit-proof-of-work.md](governance-audit-proof-of-work.md)
- [engineering-team-workflows.md](engineering-team-workflows.md)
- [agent-harness-integration-playbooks.md](agent-harness-integration-playbooks.md)
- [open-discussions.md](open-discussions.md)

## v3 Protocol Target

HA2HA v3 should preserve the v1 promise that shared state remains visible as
files, while adding optional profiles for:

- transport, validation, and methods: provisioning, optional delivery
  transports, offline validation, live conformance, operation semantics, and
  shared failure classes.
- coordination: richer work items, dependencies, claims, handoffs, review, and
  approvals.
- trust: participant identity, authority, delegation, scoped permissions, and
  actor provenance.
- evidence and review: structured proof, review comments, questions, decisions,
  and approval records anchored to workspace paths and versions.
- governance, audit, and proof of work: authority, policy gates, audit events,
  proof records, risk exceptions, and audit exports for agentic work.
- engineering: repositories, branches, commits, issues, pull requests, checks,
  deploy targets, and verification evidence.
- heterogeneous agent integration: playbooks for Codex, Claude Code,
  Cloudflare Agents SDK, Vercel eve, Vercel AI SDK, Mastra, internal harnesses,
  and MDSync skills.

These profiles should be optional and independently conformable. A simple
workspace should not need the engineering profile. An engineering workspace
should not have to encode repo, CI, or review state as ad hoc Markdown.
