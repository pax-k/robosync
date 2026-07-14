---
id: agent-context-b
kind: human-agent-pair
human: pax
agent_runtime: claude-code
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
last_seen: 2026-07-09T09:30:00Z
---

## Role

Continuation agent.
