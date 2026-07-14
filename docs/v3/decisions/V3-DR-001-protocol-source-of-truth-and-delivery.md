# V3-DR-001 Protocol Source Of Truth And Delivery

## Owner

HA2HA protocol maintainer.

## Scope

Protocol source-of-truth rule, real-time delivery, webhooks, tunnels, and
review/comment portability.

## Open Questions Covered

- Whether comments stay product-only in v2 or become a v3 protocol profile when
  shared review is claimed.
- Whether real-time delivery is protocol-required.
- Whether webhooks and tunnels belong in protocol conformance.
- Whether hidden online state can be authoritative.

## Options

- Keep review comments entirely product-private.
- Make review records portable only when `ha2ha-evidence-review` is claimed.
- Require real-time transport or webhook delivery for collaboration.
- Keep durable workspace records as the source of truth and treat delivery
  mechanisms as optional product or adapter layers.

## Recommendation

Make review records portable when the evidence/review profile is claimed. Keep
durable files, profile records, events, and file history as the only protocol
source of truth. Treat polling, server-sent events, WebSockets, webhooks, MCP,
and local tunnels as optional delivery or integration layers over durable
records.

## Accepted Outcome

Accepted.

v3 conformance does not require real-time delivery, webhooks, or tunnels.
Review/comment records are protocol-owned only when the evidence/review profile
is claimed. A reconnecting client must be able to rebuild state from workspace
records and claimed event/history records.

## Implementation Impact

- `@ha2ha/protocol` exposes v3 evidence/review schemas and validation without
  requiring online delivery.
- Webhook signing, retries, and local tunnel behavior remain product or adapter
  work.
- Product comments can coexist with portable review records, but cannot be the
  only source for claimed v3 review state.
