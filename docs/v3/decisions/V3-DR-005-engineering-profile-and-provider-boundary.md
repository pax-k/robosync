# V3-DR-005 Engineering Profile And Provider Boundary

## Owner

HA2HA protocol maintainer.

## Scope

Engineering profile records, provider boundary, required checks, multi-file
work, Git/CI/issue/deployment references, and completion blocking.

## Open Questions Covered

- Which engineering checks are generic enough for protocol conformance.
- How provider-specific Git, issue, CI, and deployment data stays behind
  adapters.
- How multi-file work is represented without heavy transaction semantics.
- Whether required checks block task completion.

## Options

- Copy provider payloads into HA2HA records.
- Make HA2HA a Git provider API.
- Store only portable provider references and evidence-linked summaries.
- Add transaction semantics for multi-file work.

## Recommendation

Keep Git, CI, issues, PR review, deployment, and chat as systems of action.
HA2HA owns portable references: repository, branch, commit, issue, pull request,
check, deployment, and code review identifiers or links. Multi-file work is
represented by task scope, path claims, handoffs, evidence, and reviews rather
than transaction semantics.

## Accepted Outcome

Accepted.

Provider-specific payloads stay behind adapters. Required checks can block
completion when the engineering profile is claimed. Engineering records must be
portable enough to inspect and validate without calling a provider API.

## Implementation Impact

- `@ha2ha/protocol` exposes engineering schemas and rejects provider payload
  leakage in portable records.
- Completion gates fail when required check records are missing, stale, failing,
  or not evidence-linked.
- No v3 record claims to replace Git, CI, issues, PR review, deployment, or
  team chat.
