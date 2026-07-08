---
id: V3-009
title: Define agent harness integration playbooks
area: product-protocol-integration
status: planned
acceptance:
  - Playbooks distinguish models, agent harnesses, agent frameworks, HA2HA, MDSync, and external systems of action.
  - Integration modes cover skills, typed tools, local-first folders, MDSync control plane, and provider sync.
  - State boundaries define what stays in private harness state versus what becomes HA2HA workspace evidence or task state.
  - Playbooks cover solo, collaborative, same-branch, parallel-branch, background-agent, incident, release, and external-collaboration scenarios.
  - Adapter requirements include actor identity, allowed write paths, baseVersion, conflict stop behavior, evidence output, validation, and secret redaction.
  - Playbooks distinguish target adapter contracts from shipped installable SDK, package, or skill artifacts.
  - Playbooks distinguish portable HA2HA skill packages from hosted MDSync product skill packages.
evidence: []
---

# V3-009 Agent Harness Integration Playbooks

## Goal

Define how teams using different models, coding agents, agent frameworks, and
internal harnesses can coordinate through HA2HA and MDSync without adopting one
shared agent runtime.

## Context

- [../agent-harness-integration-playbooks.md](../agent-harness-integration-playbooks.md)
  captures the target playbooks.
- [../transport-validation-methods.md](../transport-validation-methods.md)
  defines the cross-profile method and failure contract direction.
- [../engineering-team-workflows.md](../engineering-team-workflows.md)
  describes the v3 engineering-team workflow.

## Work

- Define integration modes for skills, typed tool adapters, local-first
  folders, MDSync control-plane use, and provider-sync adapters.
- Map Codex, Claude Code, Cloudflare Agents SDK, Vercel eve, Vercel AI SDK,
  Mastra, and internal harnesses to the right integration modes.
- Define state ownership boundaries for private reasoning, traces, code, CI,
  deployment state, tasks, evidence, decisions, review blockers, approvals, and
  dashboards.
- Define adapter requirements for reads, writes, actor identity, allowed paths,
  `baseVersion`, conflicts, evidence, validation, profile claims, and secrets.
- Record that typed tool names are target contracts until a package such as a
  client SDK, MCP adapter, or harness adapter is implemented, tested, and
  installable.
- Link portable HA2HA skill packaging and MDSync product skill packaging to
  their owning v1 and v2 tasks instead of treating skills as one generic
  artifact.
- Choose the first heterogeneous-agent demo and required evidence.

## Out Of Scope

- Standardizing one agent runtime.
- Choosing a model provider.
- Making HA2HA an agent RPC protocol.
- Encoding provider-specific payloads as portable protocol records.

## Verification

```bash
rg -n "Codex|Claude|Cloudflare|Vercel|Mastra|adapter|playbook|baseVersion" docs/v3
pnpm run check
```
