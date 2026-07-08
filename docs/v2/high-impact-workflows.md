# High-Impact Workflows

## Status

Source mode: founder-fed plus repository evidence.

This document captures product direction for workflows where MDSync and HA2HA
should make a material difference. Treat market priority, willingness to pay,
and customer urgency as validation gaps until direct customer evidence exists.

## Core Differentiator

MDSync is strongest when the work should survive an agent session.

Most teams can approximate these workflows today with chat, documents, tickets,
Git providers, screenshots, local files, and manual summaries. The gap is that
those tools do not create one shared work object that is:

- readable by humans
- readable by agents
- writable by humans and agents
- versioned per file
- conflict-aware
- evidence-bearing
- reviewable
- resumable across sessions, people, and tools

The product promise is:

```txt
not another docs app, not another agent runtime, but a shared work object that
humans and agents can both trust
```

## When MDSync Shines

The product is most valuable when at least one of these is true:

- work spans multiple agent sessions
- work spans multiple humans and multiple agents
- another agent must continue from a previous agent's state
- humans need to inspect, redirect, or approve agent work
- decisions and evidence matter as much as the final artifact
- work crosses tool boundaries such as GitHub, Slack, Linear, docs, CI, and
  customer notes
- chat history is too private, long, fragile, or unstructured to be the source
  of truth

The wedge is not Markdown hosting by itself. The wedge is durable
human-agent work state.

## Why Existing Tools Are Not Enough

| Existing Tool | Useful For | Gap MDSync Fills |
| --- | --- | --- |
| Chat | conversation and fast coordination | chat is not a durable, versioned, agent-readable work ledger |
| Docs and wikis | human-readable knowledge | docs do not define safe agent write semantics, conflicts, claims, or evidence |
| Git providers | code, branches, commits, pull requests | Git providers do not represent non-code work, agent handoffs, evidence packets, or cross-tool state cleanly |
| Issue trackers | backlog and ownership | tickets usually lose command evidence, decisions, artifacts, and agent session state |
| Notion or project boards | team planning | boards are not protocol workspaces with raw routes, file versions, and agent-safe updates |
| Local files | agent-friendly artifacts | local files are hard to share safely across humans, agents, and organizations |

MDSync should not replace those systems. It should preserve the portable work
state around them.

## Workflow Matrix

| Domain | Solo | Collaborative |
| --- | --- | --- |
| Engineering | long-running feature, proof ledger, bug hunt notebook, research-to-implementation handoff | multi-agent feature delivery, same-branch swarm, incident response, refactor/migration, PR review memory, release readiness |
| Non-engineering | consultant deliverable, founder operating workspace, content/report production, application or grant packet | customer onboarding, security questionnaire or RFP, launch campaign, research due diligence, hiring loop, customer delivery room |

## Engineering Collaborative Workflows

### Multi-Agent Feature Delivery

Use when backend, frontend, QA, docs, and review work happen in parallel across
different people and agents.

Why MDSync matters:

- each agent claims a task rather than a vague feature area
- each task links to branch, pull request, checks, decisions, and evidence
- the workspace shows cross-task blockers and readiness
- another agent can continue from a handoff without private chat history

Today this usually lives across Slack, pull requests, Linear, local chat
threads, and test output. The missing object is the shared feature work ledger.

### Same-Branch Release Or Hotfix Swarm

Use when several people and agents must work on one shared branch for a hotfix,
release branch, incident patch, migration branch, or tightly coupled feature.

Why MDSync matters:

- one workspace declares the shared branch or working line
- task claims divide the branch by path, module, test area, or investigation
  lane
- short leases and handoffs reduce stale agent work
- evidence records show what changed and what passed
- a human branch steward can decide when the branch is safe to merge or deploy

The product should not let agents simply "work on the branch." It should make
them claim narrow slices inside the shared branch.

### Large Refactor Or Migration

Use when a team needs to coordinate changes across packages, services, docs,
tests, data migrations, or configuration.

Why MDSync matters:

- task files split the migration into conflict-minimized units
- evidence proves each package or path was checked
- decisions record migration rules and exceptions
- blockers surface missing owners, flaky tests, or risky paths
- the workspace becomes a coverage map for what remains

### Incident Response

Use when humans and agents need to investigate, mitigate, verify, and follow up
under time pressure.

Why MDSync matters:

- hypotheses, logs, commands, mitigation steps, owners, and decisions live in
  one timeline
- agents can gather and summarize evidence without becoming the authority
- humans can approve risky actions and preserve the decision trail
- follow-up tasks survive after the incident call ends

### PR Review Memory

Use when pull request comments alone are not enough to preserve why a change
was made and how it was verified.

Why MDSync matters:

- requested changes link to evidence and follow-up tasks
- unresolved review threads are visible outside the Git provider UI
- an agent can repair review feedback with the full context
- final approval can point at evidence rather than a chat summary

### Release Readiness

Use when a release depends on checks, migrations, smoke tests, approvals,
rollback notes, known risks, and external coordination.

Why MDSync matters:

- release state is visible as a workspace, not a meeting note
- required checks and evidence are explicit
- missing approvals and stale evidence are easy to see
- humans retain authority over publish or rollback decisions

## Engineering Solo Workflows

### Long-Running Feature Across Sessions

Use when one builder works over days or weeks and may switch agents, machines,
or contexts.

Why MDSync matters:

- the task state survives outside the chat transcript
- decisions, branch, evidence, failed attempts, and next action stay together
- a new agent can read the workspace before acting

### Personal Proof Ledger

Use when a solo builder wants a durable record of why an agent-generated change
is safe.

Why MDSync matters:

- typecheck, lint, test, build, smoke, screenshots, and risk notes are linked
  to the task
- the user can audit agent work later
- future agents inherit evidence rather than repeating validation blindly

### Research-To-Implementation Handoff

Use when one agent investigates options and another later implements.

Why MDSync matters:

- research claims, decisions, non-goals, and rejected paths are preserved
- implementation agents can act from stable context instead of redoing the
  research
- humans can review decisions before code changes begin

### Bug Hunt Notebook

Use when debugging requires hypotheses, logs, reproduction steps, attempted
patches, and dead ends.

Why MDSync matters:

- each hypothesis and attempt can be recorded as evidence
- another agent can continue from the current state
- the final fix has a traceable path from symptom to proof

## Non-Engineering Collaborative Workflows

### Customer Onboarding Or Implementation

Use when sales, ops, support, product, customer success, customers, and agents
must coordinate a customer handoff or implementation.

Why MDSync matters:

- requirements, open questions, decisions, deliverables, approvals, and
  onboarding artifacts live together
- customer-facing and internal work can be scoped by workspace permissions
- agents can prepare drafts while humans approve commitments

### Security Questionnaire Or RFP

Use when many answers need evidence and human approval before submission.

Why MDSync matters:

- agents can draft answers by section
- evidence links support claims
- humans approve sensitive responses
- unresolved questions and missing proof are visible before submission

### Launch Campaign

Use when product, marketing, design, analytics, sales, and agents coordinate a
launch.

Why MDSync matters:

- messaging, assets, review notes, experiment plans, launch checklist, and
  post-launch evidence stay in one workspace
- agents can produce drafts and summaries without hiding source material
- approvals and changes survive outside chat

### Research Due Diligence

Use when multiple people and agents investigate competitors, vendors, markets,
legal constraints, pricing, customer signals, or technical options.

Why MDSync matters:

- claims can be separated from evidence
- contradictions and open questions stay visible
- decisions can link back to source notes
- another agent can continue from the evidence map

### Hiring Loop

Use when recruiters, hiring managers, interviewers, and agents coordinate
candidate packets and decisions.

Why MDSync matters:

- interview plans, scorecards, notes, follow-ups, decision records, and offer
  steps stay organized
- sensitive authority remains human-owned
- agents can prepare packets and summaries without becoming the decision-maker

### Customer Delivery Room

Use when an agency, consultant, or services team needs to coordinate work with a
client and agent assistance.

Why MDSync matters:

- scope, tasks, drafts, client questions, approvals, and final handoff are
  shareable without granting access to internal chat or repositories
- agents can continue from prior deliverables and evidence
- client-facing status is inspectable

## Non-Engineering Solo Workflows

### Consultant Or Client Deliverable

Use when a solo consultant uses agents to produce a strategy, analysis,
implementation plan, audit, or report.

Why MDSync matters:

- source notes, drafts, tasks, review questions, and final output live in one
  workspace
- the client can inspect the deliverable without receiving raw private chat
- later revisions have durable context

### Founder Operating Workspace

Use when a founder coordinates fundraising, customer discovery, hiring,
planning, product research, or investor updates with agent help.

Why MDSync matters:

- plans, questions, evidence, decisions, and next actions survive across agent
  sessions
- sensitive decisions remain inspectable and human-owned
- the workspace can become a lightweight operating packet

### Content Or Report Production

Use when research, outline, draft, editing, fact checking, approval, and final
export happen across multiple sessions.

Why MDSync matters:

- source notes and fact checks stay attached to the draft
- review comments are anchored to paths or versions
- another agent can continue editing without relying on a long transcript

### Application, Grant, Or Legal Packet

Use when forms, evidence, draft answers, review questions, approvals, and
submission status must be coordinated.

Why MDSync matters:

- every answer can link to evidence or an open question
- humans approve commitments before submission
- the final packet and its source material are preserved together

## Workspace Type Presets

The product should eventually offer presets that map to different profile
mixes.

| Preset | Best For | Profiles |
| --- | --- | --- |
| Single artifact | one Markdown report or shareable output | core |
| Solo work packet | long-running individual work with evidence | core, minimal task/evidence metadata |
| Team workspace | collaborative non-code work | core, coordination, trust, evidence/review |
| Engineering feature | multi-branch or same-branch software work | core, coordination, trust, evidence/review, engineering |
| Release or incident | high-risk engineering coordination | core, coordination, trust, evidence/review, engineering |
| Research or due diligence | claims, sources, decisions, and contradictions | core, coordination, evidence/review |
| Customer delivery room | client-facing tasks, deliverables, questions, approvals | core, coordination, trust, evidence/review |

## Product Requirements Implied By These Workflows

- workspace templates for the presets above
- first-party skills for publish, join, read, claim, update, evidence, review,
  handoff, close, and export
- product UI for next required action, blockers, stale claims, missing evidence,
  unresolved questions, review state, and approvals
- import/export that preserves tasks, decisions, evidence, logs, and profile
  declarations
- provider adapters only where the workflow needs external references, such as
  GitHub, GitLab, Linear, Jira, Slack, CI, deployment tools, CRMs, or document
  systems
- clear authority boundaries so agents draft, gather, summarize, and update
  workspace state while humans approve sensitive commitments

## Open Validation Questions

- Which workflow has the strongest first buyer: engineering feature delivery,
  incident/release readiness, customer onboarding, RFP/security responses, or
  consultant deliverables?
- Which workflow has the clearest before/after demo?
- Which workflow creates enough pain that teams will install skills and change
  habits?
- Which non-engineering workflows need stronger privacy, identity, or approval
  controls before they are credible?
- Which workflows can be proven with a manual pilot before building provider
  adapters?
