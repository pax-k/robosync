# v3 Open Discussions

This file captures early product and protocol ideas before they become decision
records or implementation tasks.

The goal is to assess whether each idea is useful, where it belongs, and what
must be decided before work starts. v1 remains the current HA2HA protocol
authority. v2 remains the MDSync product layer. v3 is future protocol direction.

## Assessment Scale

- Strong yes: worth pursuing once prerequisite contracts exist.
- Scoped yes: useful only with a narrow boundary or maturity gate.
- Defer: likely useful, but premature for the current release horizon.
- Avoid for now: likely to confuse the product or protocol if added now.

## Summary

| Idea | Assessment | Recommended Scope | Why |
| --- | --- | --- | --- |
| Encryption | Scoped yes | v2 product decision first, possible future protocol metadata later | Valuable for trust, but key ownership changes preview, raw routes, search, comments, and indexing. |
| Real-time data | Scoped yes | Product event delivery over protocol event/history records | Useful for freshness, but HA2HA should not become a real-time editor or agent RPC protocol. |
| Skills to offer | Strong yes | Agent adoption layer over v0/v1 workflows | Skills are the easiest way for agents to read, publish, update, and coordinate through HA2HA workspaces. |
| Bundled scripts with skills | Scoped yes | Small audited reference scripts with explicit env vars and permissions | Scripts make skills reliable, but bundled executable code needs a low-trust install and review model. |
| Webhooks and tunnels | Defer | Product integration adapters, not core protocol | Webhooks are useful after event semantics stabilize. Tunnels are useful for local dev, but risky as a default workflow. |

## Encryption

Assessment: scoped yes.

Encryption is good if MDSync is expected to hold private workspaces, sensitive
coordination notes, evidence, or customer artifacts. It is not good as a vague
toggle because the key model decides which product capabilities still work.

Server-managed encryption preserves the current product shape:

- browser preview
- deterministic raw plaintext routes
- search
- comments and review anchors
- server-side indexing and migrations
- easier recovery and support

Client-side or end-to-end encryption improves the trust story but weakens or
removes server-side capabilities:

- the server cannot render, search, index, or validate plaintext without a key
- raw routes may need to return ciphertext or require client-held decryption
- comments and review anchors become harder if the server cannot inspect
  headings, line selectors, or file content
- key loss becomes data loss unless recovery is explicitly designed
- protocol validators can only validate encrypted envelopes, not document
  semantics

Recommendation:

- Do not add encryption implementation work before a key-ownership decision.
- Treat server-managed encryption as the likely first product maturity step.
- Treat end-to-end encryption as a separate product mode with reduced
  capabilities, not as a transparent upgrade.
- Keep HA2HA protocol conformance independent from a specific retention or
  encryption provider.

Decision questions:

- Who owns the workspace encryption key: server, workspace owner, participant,
  external KMS, or local client?
- Does MDSync need plaintext access for preview, validation, search, comments,
  or indexing?
- Is encrypted workspace sharing still link-capability based, identity based,
  or both?
- What is the recovery story when a key is lost or rotated?

## Real-time Data

Assessment: scoped yes.

Real-time freshness is useful for product UX: activity feeds, update badges,
claim status, review comments, stale task warnings, and active participant
presence. It is not a reason to turn HA2HA into a collaborative text editor.

Good uses:

- push notifications for workspace event records
- stale task or claim warnings
- comment and review updates
- activity feed updates
- conflict risk indicators before a write
- lightweight presence when identity exists

Poor uses for the current direction:

- character-level collaborative editing
- hidden state that is not recoverable from versioned files or event records
- direct agent-to-agent RPC
- protocol-required WebSocket sessions
- correctness that depends on every client staying connected

Recommendation:

- Build durable event and file-history semantics first.
- Let product UI subscribe to those durable records through polling, server-sent
  events, or WebSockets.
- Keep real-time delivery optional and lossy. The source of truth should remain
  versioned files plus event/history records.
- Avoid presence as a trust mechanism. Presence can improve UX, but authority
  must come from profile data, grants, claims, approvals, and audit events.

Decision questions:

- Which events need low-latency delivery, and which can remain refresh-driven?
- Should MDSync use polling first, then graduate to server-sent events or
  WebSockets after event semantics stabilize?
- What must clients do after reconnect: replay events, refetch current files,
  or both?

## Skills To Offer

Assessment: strong yes.

Agent skills are a strong adoption path because HA2HA only becomes useful when
agents know how to read and write the workspace safely. Skills should wrap the
protocol into repeatable agent behavior without hiding the workspace from
humans.

Good first skills:

- publish a Markdown file as a workspace
- publish a folder as a workspace
- read a workspace from a raw listing URL
- update one file with `baseVersion` conflict handling
- create or update `STATUS.md`
- claim a task and add evidence
- review a task and leave anchored feedback
- export or snapshot a workspace

Potential later skills:

- create a HA2HA coordination workspace from templates
- migrate a v0 workspace into v1 conventions
- run validator checks and write evidence
- summarize changes from event and file-history records
- prepare a human handoff packet

Recommendation:

- Start with narrow skills that prove the core protocol loop: publish, read,
  update, conflict handling, and evidence.
- Keep skills protocol-aware but implementation-light. A skill should call a
  script or stable API rather than reimplementing HTTP details in prose.
- Give each skill a clear permission and token-handling section.
- Make every mutating skill state exactly which workspace paths it may edit.

Decision questions:

- Are these skills shipped as Codex skills, generic Markdown instructions,
  npm packages, or all three?
- Which skill is canonical for write conflict behavior?
- What minimum evidence should a mutating skill leave behind?

## Bundling Scripts With Skills

Assessment: scoped yes.

Bundling scripts with skills is good when it turns a fragile prose workflow into
a repeatable command. It becomes risky when the script is opaque, overpowered,
hard to audit, or silently handles tokens.

Good candidates:

- `upload-file`
- `upload-workspace`
- `update-file`
- `read-workspace`
- `write-status`
- `append-evidence`
- `validate-workspace`

Rules for bundled scripts:

- Keep scripts small, readable, and reference-grade.
- Use explicit environment variables such as `MDSYNC_BASE_URL` and
  `MDSYNC_WRITE_TOKEN`.
- Do not print write tokens unless the user explicitly needs an edit link.
- Require `baseVersion` for updates.
- Stop after a second write conflict and surface the conflict to the human.
- Avoid global installs as the default path.
- Avoid scripts that execute arbitrary workspace content.
- Version scripts alongside the protocol or product API they target.

Recommendation:

- Bundle scripts only as reviewed reference clients for stable workflows.
- Prefer a package or CLI once the script surface grows beyond a few commands.
- Treat scripts as implementation aids, not protocol authority. Protocol
  authority should remain schemas, examples, validators, and conformance checks.

Decision questions:

- Should scripts live in the product repo, a future `ha2ha-tools` package, or
  inside each skill bundle?
- What is the compatibility promise when API routes or schema versions change?
- Should bundled scripts emit structured JSON results for agents?

## Webhooks And Tunnels

Assessment: defer.

Webhooks are useful for integrations after event semantics are stable. Tunnels
are useful for demos and local development, but risky as a default collaboration
path.

Good webhook uses:

- notify an external service that a workspace changed
- notify an agent runner that a claimed task needs attention
- trigger indexing, export, backup, or validation
- publish review or approval events into another system

Webhook risks:

- leaked capability URLs or tokens
- duplicate delivery and retry storms
- unsigned or unauthenticated callbacks
- unclear ownership when an external agent mutates the workspace
- event ordering assumptions that are not guaranteed

Tunnel uses:

- local agent runner receives webhook callbacks during development
- demos where a local process needs to respond to workspace events
- integration testing against a local service

Tunnel risks:

- accidental public exposure of local services
- unstable callback URLs
- hard-to-audit traffic paths
- tokens appearing in tunnel logs
- users confusing local-demo plumbing with production architecture

Recommendation:

- Do not make tunnels part of HA2HA protocol scope.
- Do not require webhooks for protocol conformance.
- Add webhooks later as MDSync product integration adapters over durable
  workspace events.
- Require signed deliveries, retry limits, idempotency keys, and least-privilege
  target tokens before product webhooks are considered production-ready.
- Keep tunnels as an opt-in local development guide, not a bundled default.

Decision questions:

- Which event types are safe and useful to deliver externally?
- What signature scheme and replay window should webhook receivers validate?
- Can a webhook-triggered agent write back, and if so, under whose authority?
- Should local tunnels ever be generated automatically, or always user-provided?

## Decision Record Candidates

These discussions should become decision records before implementation:

- Encryption key ownership model.
- Real-time delivery boundary and source-of-truth rule.
- Canonical first-party HA2HA/MDSync agent skills.
- Script packaging and compatibility policy.
- Webhook event model, signing, retries, and authority.
- Local tunnel policy for demos and development.

## Current Direction

The strongest near-term bet is skills plus small reference scripts for the
existing upload, read, update, conflict, and evidence workflows.

Encryption is important but should wait for a key-ownership decision. Real-time
data is useful as product delivery over durable events, not as core protocol
state. Webhooks should wait until event records are stable. Tunnels should stay
local-development only.
