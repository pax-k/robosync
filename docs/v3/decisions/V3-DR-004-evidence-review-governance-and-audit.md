# V3-DR-004 Evidence Review Governance And Audit

## Owner

HA2HA protocol maintainer.

## Scope

Evidence kinds and quality, review anchors, approval records, governance profile
shape, audit events, risk exceptions, chain-of-thought boundary, tamper-evidence
posture, and audit exports.

## Open Questions Covered

- Whether governance/audit/proof-of-work is standalone or a profile bundle.
- Which evidence kinds are required for the first engineering-team tier.
- How reviewers mark evidence accepted, rejected, stale, or insufficient.
- Which actions emit audit events.
- Whether audit events must be hash chained before enterprise positioning.
- Whether raw chain-of-thought is stored.
- What an audit export contains.

## Options

- Treat governance as product dashboard state only.
- Require full legal/regulatory compliance semantics.
- Define a standalone governance profile that composes coordination, trust,
  evidence/review, engineering, and method contracts.
- Store raw model reasoning and provider traces as audit evidence.

## Recommendation

Define a standalone governance profile with narrow portable records. Keep legal
compliance, SIEM, IAM, EDR, retention policy, provider traces, and raw private
reasoning outside protocol scope. Require audit exports to preserve tasks,
evidence, approvals, decisions, audit events, file versions, and claimed profile
records. Defer hash chains and signed exports until integrity requirements are
clearer.

## Accepted Outcome

Accepted.

Governance/audit/proof-of-work is a v3 profile. The first evidence kinds are
command, check, review, approval, deployment, manual, and external-link
summaries. Evidence quality states are `accepted`, `rejected`, `stale`,
`insufficient`, and `risk-accepted`. Raw chain-of-thought, raw credentials, and
provider-private traces are forbidden in portable records.

## Implementation Impact

- v3 schemas include proof-of-work, audit event, policy gate, risk exception,
  and audit export records.
- Completion can be blocked when required proof, review, approval, or check
  state is missing, stale, rejected, unresolved, or failing.
- Hash-chained audit events and signed manifests remain future work, not a
  prerequisite for current v3 profile validation.
