# Governance, Audit, And Proof Of Work

## Status

Source mode: founder-fed plus repository evidence and external governance
research.

This is v3 product and protocol direction. It does not describe current v1
conformance. v1 provides an evidence-bearing workspace substrate. v3 should
define the agent governance, audit, and proof-of-work semantics needed for
teams that rely on agents for consequential work.

## Why This Matters

Agent adoption is moving faster than governance infrastructure.

Teams increasingly need to answer:

- Which agent acted?
- Which human or organization authorized it?
- What was the agent allowed to read, write, approve, or publish?
- Which tools, data sources, files, branches, pull requests, checks, and
  deployments did it touch?
- What evidence proves the work was done?
- Which human reviewed or approved the outcome?
- What was blocked, missing, overridden, or accepted as risk?
- Can the organization reconstruct this after an incident, audit, customer
  review, or regulator request?

The wedge is:

```txt
a portable, inspectable work ledger that proves what agents did,
under whose authority, with what evidence, and with what human review
```

This is stronger than "agent logs" because the proof is not trapped inside one
agent runtime, chat transcript, CI provider, or SaaS product.

## External Governance Signals

Current governance and security guidance converges on the same pressure points.

- CISA, NSA, ASD ACSC, Canadian Centre for Cyber Security, NCSC-NZ, and NCSC-UK
  guidance on agentic AI highlights privilege, design/configuration, behavior,
  structural, and accountability risks. It recommends aligning agentic AI with
  existing security models, avoiding broad or unrestricted access, starting
  with low-risk tasks, and maintaining governance, monitoring, accountability,
  and human oversight:
  <https://media.defense.gov/2026/Apr/30/2003922823/-1/-1/0/CAREFUL%20ADOPTION%20OF%20AGENTIC%20AI%20SERVICES_FINAL.PDF>
- NIST AI RMF frames governance as cross-cutting and continuous. It emphasizes
  documentation, risk management across the AI lifecycle, transparency, and
  accountability:
  <https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf>
- NIST AI 600-1, the Generative AI Profile, emphasizes provenance, content
  origin/history, monitoring, lineage validation, and incident reporting:
  <https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf>
- The EU AI Act requires high-risk systems to technically allow automatic event
  recording and traceability over the lifetime of the system:
  <https://www.artificial-intelligence-act.com/Artificial_Intelligence_Act_Article_12.html>
- OWASP's Agentic Top 10 identifies risks such as goal hijack, tool misuse,
  identity and privilege abuse, supply-chain compromise, unexpected code
  execution, memory poisoning, insecure inter-agent communication, cascading
  failures, human-agent trust exploitation, and rogue agents:
  <https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/>

HA2HA should not attempt to replace those frameworks. It should provide the
portable work record that helps organizations satisfy the traceability,
evidence, and accountability questions those frameworks raise.

## What HA2HA Already Solves

v1 already gives us a useful base:

- versioned files
- `baseVersion` conflict handling
- actor attribution on mutating writes
- stable workspace paths
- target coordinates: `workspaceId`, `path`, and `version`
- `evidence/` files linked to tasks or targets
- event and file-history profiles
- conformance evidence for claimed implementation behavior
- agent skill safety rules for allowed paths, conflict handling, evidence
  output, and stop conditions

This is a real advantage. Many agent systems can log tool calls, but they do
not naturally produce a portable, human-inspectable work object that another
agent, reviewer, or auditor can continue from.

## What v1 Does Not Claim

v1 should not be marketed as audit-grade governance.

Known v1 limits:

- Actor handles provide attribution, not verified identity.
- Actor handles do not prove authority, delegation, approval, or RBAC.
- Evidence metadata is intentionally small.
- File history is useful but not tamper-evident by itself.
- Skills can declare allowed paths, but v1 does not define enforceable
  authority grants.
- v1 does not standardize approvals, reviewer authority, required checks,
  leases, handoffs, risk exceptions, or audit exports.
- v1 does not prove that external tool calls or provider actions happened
  exactly as summarized.
- v1 does not store private model reasoning, and should not claim to.

This boundary is important. v1 can support audit narratives. It cannot yet
support regulated audit-grade controls.

## v3 Governance Profile

v3 should introduce a governance/audit/proof-of-work profile that composes:

- coordination profile: claims, leases, handoffs, blockers, acceptance,
  questions, and approvals
- trust profile: principals, human-agent pairs, roles, authority grants,
  delegation, and audit events
- evidence/review profile: evidence records, check results, review comments,
  questions, responses, and approval records
- engineering profile: repositories, branches, commits, issues, pull requests,
  checks, deployments, and code review references
- transport/method contracts: method preconditions, allowed write sets,
  idempotency, failure classes, event emission, and evidence emission
- agent harness playbooks: adapter rules for Codex, Claude Code, Cloudflare
  Agents SDK, Vercel eve, Vercel AI SDK, Mastra, and internal harnesses

The profile should not create a separate governance silo. It should define the
minimum portable records needed to answer audit and proof-of-work questions
across products and agent runtimes.

## Public Primitives

- governance scope: the workspace, project, incident, release, audit, or
  customer workflow being governed.
- principal: a human, agent runtime, service account, team, or organization.
- human-agent pair: a declared relationship between a human and the agent
  acting on their behalf.
- authority grant: scoped permission to read, write, claim, approve, publish,
  deploy, administer, or request external actions.
- policy gate: a rule that blocks a transition or method until required
  evidence, review, approval, or risk acceptance exists.
- proof-of-work record: structured evidence that a task, check, review,
  deployment, or decision happened.
- audit event: an append-only record of a sensitive, authority-bearing, or
  governance-relevant action.
- risk exception: an explicit acceptance of missing, stale, failed, or partial
  evidence.
- audit export: a portable package or manifest that preserves the governance
  record for review outside the live product.

## Proof-Of-Work Record Shape

Draft frontmatter:

```yaml
id: pow-RS-042-typecheck
task: RS-042
target:
  workspaceId: abc123
  path: tasks/RS-042.md
  version: 12
kind: command
result: pass
actor: codex-pax
created_at: 2026-07-08T12:20:00Z
authority:
  delegated_by: pax
  grant: workspace-write
environment:
  cwd: /workspace
  runtime: node
command:
  text: pnpm run check-types
  exit_code: 0
artifacts:
  - path: evidence/RS-042/check-types-output.txt
hashes:
  evidence/RS-042/check-types-output.txt: sha256:hex
links:
  - type: pull-request
    url: https://github.com/example/repo/pull/42
review:
  required: true
  accepted_by: pax
  accepted_at: 2026-07-08T12:40:00Z
```

The exact schema should stay narrow. It should capture enough to prove the work
and evaluate the claim without dumping private logs, credentials, or
model-private reasoning into the workspace.

## Audit Event Shape

Draft event:

```json
{
  "id": "audit_01",
  "workspaceId": "abc123",
  "type": "approval.recorded",
  "actor": "pax",
  "principal": "pax",
  "authorityBasis": "workspace-owner",
  "target": {
    "workspaceId": "abc123",
    "path": "tasks/RS-042.md",
    "version": 12
  },
  "createdAt": "2026-07-08T12:40:00.000Z",
  "payload": {
    "approvedEvidence": ["pow-RS-042-typecheck"],
    "riskAccepted": false
  }
}
```

Audit events should be append-oriented. If an event is corrected, the
correction should be another event, not silent mutation.

## Governance Controls

The profile should define portable semantics for:

- required actor identity on every mutating method
- human-agent pair mapping for delegated agent work
- authority grants scoped by path, method, effect, and time window
- method-level allowed write sets
- approval gates before publish, deploy, merge, close, or external send
- required proof-of-work before `review` or `done`
- stale evidence detection
- blocking unresolved review comments
- risk exceptions when work proceeds despite missing or failed evidence
- secret redaction in logs, evidence, events, and exports
- audit event emission for sensitive actions
- export preservation for tasks, evidence, decisions, audit events, approvals,
  and file history

## MDSync Product Role

MDSync can make governance operational without making the protocol product
private.

Product-owned surfaces:

- governance dashboard
- missing-evidence view
- stale-check warnings
- unresolved-review view
- approval queue
- risk exception queue
- actor and human-agent pair display
- token rotation and revocation UX
- provider adapters for GitHub, GitLab, Linear, Jira, CI, deployment systems,
  incident tools, and chat
- audit export UX
- retention and legal hold policy
- admin audit logs

Protocol-owned surfaces:

- portable record shapes
- task and evidence links
- target coordinates
- authority and delegation semantics
- audit event semantics
- policy gate semantics
- conformance requirements
- export preservation expectations

## Blind Spots To Resolve

### Tamper Evidence

File versions and event history are not enough for audit-grade integrity.

Open decisions:

- Should audit events be hash chained?
- Should evidence artifacts include required hashes?
- Should audit exports include a signed manifest?
- Should MDSync support external notarization or timestamping?

### Identity And Authority

v3 must avoid forcing one identity provider while still proving who acted.

Open decisions:

- What is the minimum portable principal shape?
- How are human-agent pairs verified?
- Can an agent approve work, or only a human principal?
- How are revoked grants represented in historical records?

### Evidence Quality

Not every evidence file is proof.

Open decisions:

- Which evidence kinds are allowed?
- Which fields are required for command, CI, deployment, manual, screenshot,
  and external-link evidence?
- How does a reviewer mark evidence as accepted, rejected, stale, or
  insufficient?
- How should evidence freshness be calculated?

### Runtime Enforcement

Recording governance after the fact is useful, but high-risk actions need
pre-action gates.

Open decisions:

- Which methods must check policy gates before execution?
- Which failures are blocking versus warning?
- Should product adapters refuse external actions when required workspace
  approvals are missing?
- How are emergency overrides represented?

### Chain Of Thought

HA2HA should not require storing private model reasoning.

Store:

- tool-call summaries
- inputs and outputs when safe
- reasoning summaries when available and useful
- evidence
- decisions
- review state
- final actions

Do not store:

- raw private chain-of-thought
- raw credentials
- sensitive prompts that are not needed for proof
- provider-private trace internals

## Conformance Expectations

An implementation should not claim governance/audit/proof-of-work support until
it can prove:

- authority grants validate
- actor and principal fields are required for sensitive actions
- missing required evidence blocks completion
- stale or failed checks block completion when required
- approval records identify principal, authority basis, target, and evidence
- audit events are append-oriented
- secrets and raw tokens are rejected from audit records and evidence
- audit exports preserve tasks, evidence, approvals, decisions, events, file
  versions, and claimed profile records
- conformance output identifies profile, check IDs, observed behavior, expected
  behavior, and whether failures are blocking

## First Useful Product Slice

The smallest credible governance demo:

1. Create an MDSync workspace for a repo task.
2. Agent A claims the task under a human-agent pair.
3. The workspace declares required proof: typecheck, test, review, and human
   approval.
4. Agent A writes evidence for a command check.
5. Agent B or a provider adapter records pull request and CI references.
6. MDSync blocks `done` because human approval is missing.
7. A human reviews the evidence and records approval.
8. The task closes and an audit export shows actor, authority, evidence,
   approval, target coordinates, and file history.

This proves the core enterprise claim without promising full regulatory
compliance.

## Positioning

Good positioning:

```txt
MDSync gives teams an agent proof-of-work ledger: who acted, under whose
authority, what changed, what evidence exists, and what a human approved.
```

Avoid positioning:

- "compliance in a box"
- "full AI Act compliance"
- "complete agent observability"
- "chain-of-thought audit trail"
- "runtime security layer for every agent"

The credible claim is narrower and stronger: portable work-state governance
for human-agent teams.

## Open Decisions

- Is governance/audit/proof-of-work a standalone v3 profile or a product
  bundle that composes trust, evidence/review, coordination, and engineering?
- What is the minimum portable authority grant schema?
- Which actions must emit audit events?
- Which evidence kinds are required for the first engineering-team tier?
- Do we need hash-chained audit events before public enterprise positioning?
- What does an audit export contain?
- How does MDSync separate product admin logs from HA2HA portable audit events?
