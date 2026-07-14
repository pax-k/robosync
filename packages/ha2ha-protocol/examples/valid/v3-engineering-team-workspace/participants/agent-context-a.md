---
id: agent-context-a
kind: human-agent-pair
human: pax
agent_runtime: codex
roles:
  - contributor
can_edit: true
authority:
  can_read: true
  can_write: true
  can_claim: true
  can_approve: false
delegated_by: pax
delegation_scope:
  paths:
    - tasks/
    - evidence/
    - handoffs/
  methods:
    - task.claim
    - task.handoff
    - evidence.add
  max_effect: workspace-write
last_seen: 2026-07-09T09:10:00Z
---

## Role

Initial implementation agent.
