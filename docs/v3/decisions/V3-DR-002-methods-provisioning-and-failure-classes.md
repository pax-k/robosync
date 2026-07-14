# V3-DR-002 Methods Provisioning And Failure Classes

## Owner

HA2HA protocol maintainer.

## Scope

Transport, validation, provisioning, method ownership, idempotency, operation
records, MCP boundary, and shared failure classes.

## Open Questions Covered

- Whether workspace creation is a v3 provisioning profile.
- Which methods are generic enough for protocol ownership.
- Whether method attempts are recorded as operation records, event records, or
  only resulting file changes.
- Whether mutating methods require idempotency keys.
- Which transports are conformance targets beyond HTTP.
- Whether MCP tools are protocol or adapters.
- How validators distinguish warnings from profile-blocking errors.

## Options

- Keep all high-level operations product-private.
- Make every agent/tool action a protocol RPC method.
- Define a small portable method set whose persisted workspace effects validate
  independently.
- Make workspace provisioning mandatory for v3.

## Recommendation

Define a small first-slice method set and structured failure classes. Treat
workspace provisioning as optional. Record method attempts as portable operation
records when they matter for conformance or audit, while preserving the v1
file/version/event substrate. Keep MCP tools as adapters over protocol methods,
not as protocol authority.

## Accepted Outcome

Accepted.

The first v3 method contracts are:

- `workspace.validate`
- `task.claim`
- `task.handoff`
- `evidence.add`
- `review.comment`

The first shared failure classes are:

- `validation_failed`
- `version_conflict`
- `authority_denied`
- `state_conflict`
- `missing_evidence`
- `unresolved_review`
- `external_unavailable`
- `unsupported_profile`
- `human_input_required`

## Implementation Impact

- `@ha2ha/protocol` exposes typed method constants, method contract schemas, and
  validation output schemas.
- v3 method validation requires stable rule IDs, severity, path, message,
  repair hint, and profile impact.
- v3 does not become agent RPC, provider RPC, or a real-time editor.
