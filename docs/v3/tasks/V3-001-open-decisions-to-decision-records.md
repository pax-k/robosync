---
id: V3-001
title: Convert v3 open decisions to decision records
version: v3
state: done
priority: high
depends_on: [V1-007]
area: protocol-design
acceptance:
  - Each open decision has an owner, options, recommendation, and accepted outcome.
  - Decisions identify whether scope is protocol, product, or implementation.
  - No v3 schema work starts before the relevant decision is accepted.
evidence:
  - "Added v3 decision records under `docs/v3/decisions/` with owner, scope, options, recommendation, accepted outcome, and implementation impact."
  - "Decision records cover source of truth and delivery, methods/provisioning/failures, identity/authority/approval, evidence/review/governance/audit, engineering/provider boundaries, and skills/scripts/harness adapters."
  - "Linked decision authority from `docs/v3/README.md` and `docs/v3/open-discussions.md`."
  - "`pnpm --filter @ha2ha/protocol test` passed after v3 schema, validator, fixture, and decision-record work."
---

## Intent

Prevent v3 from becoming vague future scope by recording decisions before implementation.

## Current Evidence

- [../collaboration-protocol.md](../collaboration-protocol.md) lists open decisions for comments, claims, identity, approvals, multi-file work, and engineering checks.
- [../open-discussions.md](../open-discussions.md) assesses early ideas for encryption, real-time data, skills, bundled scripts, webhooks, and tunnels.

## Work

- Create decision records for each open question.
- Separate portable protocol semantics from product UI and provider implementation.
- Link accepted decisions back into v3 docs.

## Acceptance

- v3 profile work has clear decision authority.
- Unresolved decisions remain visible and blocking where appropriate.

## Test Requirements

- Add docs validation or searchable checks proving each open decision has owner, options, recommendation, accepted outcome or blocking state, and scope.
- Keep schema or conformance tests blocked until the relevant decision record is accepted.

## Verification

```bash
rg -n "Open Decisions|accepted|decision" docs/v3
pnpm run check
```
