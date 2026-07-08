---
id: V4-002
title: Define team aggregate stats and logs
version: v4
state: planned
priority: high
depends_on: [V4-001]
area: product-observability
acceptance:
  - Team stats are documented as product projections, not HA2HA protocol records.
  - Aggregate stats cover workspaces, files, versions, events, comments, conflicts, storage, cleanup, retention, and health.
  - Team audit events are append-oriented product records.
  - Raw tokens, credentials, and provider-private logs are excluded from audit payloads.
evidence: []
---

# V4-002 Team Aggregate Stats And Logs

## Intent

Give team admins a cross-workspace view of activity, health, risk, and
operational state.

## Context

- v2 already has per-workspace admin stats.
- v4 needs team-level projections across many workspaces.
- Team audit events must be separate from HA2HA protocol events.

## Work

- Define `team_audit_events`.
- Define team aggregate stats DTOs.
- Identify which stats can be live queries.
- Identify which stats may need future daily rollups.
- Define recent activity and recent audit log behavior.
- Add authorization expectations for team stats APIs.

## Out Of Scope

- Tamper-evident audit chains.
- SIEM replacement.
- Billing-grade metering before pricing evidence exists.

## Verification

```bash
rg -n "aggregate|audit|stats|logs|projection|rollup" docs/v4
pnpm run check
```

