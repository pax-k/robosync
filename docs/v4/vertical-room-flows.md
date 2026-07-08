# Vertical Room Flows

## Status

Source mode: founder-fed plus repository evidence.

This document captures reusable v4 product-flow patterns for domain-specific
MDSync rooms. It is MDSync hosted product scope, not HA2HA protocol authority.

The purpose is to show how the same control-plane principles can support
non-engineering and governance-heavy products without creating a new protocol
track for every market.

## Product Thesis

MDSync can package the same HA2HA-backed coordination substrate as vertical
rooms:

```txt
human intent in UI
  -> durable workspace record
  -> agent pickup across a boundary
  -> agent produces evidence, drafts, artifacts, or questions
  -> UI renders review state and next required action
  -> human approves, redirects, blocks, publishes, or closes
  -> workspace remains portable and inspectable
```

The product is not a chat room with files. It is a control room for work that
crosses human, agent, organization, and tool boundaries.

## Core Boundary

Every vertical room should preserve the same authority split:

- The UI is the human control surface.
- The HA2HA workspace is the durable coordination record.
- Agents are bounded workers that draft, gather, summarize, update, and leave
  evidence.
- External tools remain systems of action for their own domains.
- Humans own authority-bearing decisions such as approval, submission,
  publication, escalation, risk acceptance, and closure.

The workspace record should be understandable without the original chat thread
or agent session. Another human or agent should be able to continue from the
current files, task state, evidence, decisions, and review records.

## Shared Flow

1. A human creates a room, card, or work item in the product UI.
2. MDSync creates or selects a team workspace.
3. MDSync materializes durable work state such as `STATUS.md`, task files,
   evidence folders, decision records, review records, and room-specific
   files.
4. The human sets constraints: allowed sources, allowed effects, required
   evidence, reviewers, due date, visibility boundary, and publishing rules.
5. An eligible agent discovers the work through an inbox, skill, event, or
   adapter.
6. The agent reads the workspace, claims a bounded task, and works in its own
   environment.
7. The agent writes back drafts, evidence, source notes, questions, blockers,
   handoff notes, or artifact links.
8. MDSync updates the UI from workspace records and product indexes.
9. Humans review the delta, answer questions, request more evidence, approve,
   reject, publish, send, or close.
10. The final room remains available as an exportable work packet with its
    tasks, artifacts, evidence, decisions, approvals, and audit events.

## Room Components

Most vertical rooms should compose these product pieces:

- room template
- workspace manifest
- task template
- allowed source policy
- required evidence policy
- review and approval gates
- agent inbox filters
- domain-specific artifact folders
- external references
- audit events for sensitive actions
- export or final packet generation

The specific UI can vary by domain. The control-plane contract should not.

## RFP Or Security Questionnaire Room

Use when a team needs to answer a questionnaire, RFP, procurement request, or
security review with evidence and human approval.

### Flow

```txt
security lead uploads questionnaire in UI
  -> MDSync creates sections and answer tasks
  -> human selects approved source folders, docs, and prior answers
  -> agent drafts answers and links evidence
  -> agent marks questions answered, blocked, or needing human input
  -> UI shows missing evidence, sensitive claims, and approval state
  -> humans approve answers or request changes
  -> UI exports final response packet
```

### Workspace Shape

```txt
HA2HA.md
STATUS.md
tasks/
answers/
sources/
evidence/
questions/
approvals/
decisions/
logs/
```

### Human Authority

Agents may draft, cite, compare, and flag gaps. They should not submit final
answers, make unsupported security claims, or approve exceptions unless a
human explicitly grants that authority.

## Client Delivery Room

Use when consultants, agencies, implementation teams, customer success, product,
and customers coordinate deliverables with agent support.

### Flow

```txt
human creates client room in UI
  -> MDSync creates scope, milestones, deliverables, and question tasks
  -> agent drafts deliverables, status updates, and internal evidence
  -> human reviews what can cross the client boundary
  -> client-facing view exposes approved status, files, and questions
  -> human approves final handoff or requests more work
```

### Workspace Shape

```txt
HA2HA.md
STATUS.md
scope/
tasks/
deliverables/
client-questions/
internal-notes/
evidence/
decisions/
approvals/
handoff/
```

### Human Authority

The important boundary is internal versus external. Agents can help internal
execution, but humans control what becomes visible to the client and what
commitments are made.

## Incident Or Audit Room

Use when humans and agents need to investigate, mitigate, prove, and follow up
on an incident, audit request, compliance review, or operational failure.

### Flow

```txt
human opens incident or audit room in UI
  -> MDSync creates timeline, hypothesis, mitigation, and follow-up tasks
  -> agents gather logs, summarize signals, and propose checks
  -> evidence links to commands, dashboards, screenshots, and source systems
  -> human approves mitigation, rollback, disclosure, or risk acceptance
  -> UI shows unresolved risks, blockers, and missing proof
  -> final audit packet preserves timeline, evidence, decisions, and approvals
```

### Workspace Shape

```txt
HA2HA.md
STATUS.md
timeline/
hypotheses/
tasks/
mitigations/
evidence/
decisions/
approvals/
follow-ups/
logs/
```

### Human Authority

Agents may investigate and prepare recommended actions. Humans approve risky
operational changes, customer-facing statements, regulatory submissions,
rollback, disclosure, and final closure.

## Research Or Due Diligence Room

Use when people and agents evaluate vendors, markets, competitors, investments,
technical options, legal constraints, or strategic decisions.

### Flow

```txt
human creates research room in UI
  -> MDSync creates claims, source, question, and decision tasks
  -> agents gather sources, extract claims, and flag contradictions
  -> UI separates supported claims from open questions and weak evidence
  -> humans decide which findings are accepted, rejected, or escalated
  -> final packet preserves claims, evidence, contradictions, and decisions
```

### Workspace Shape

```txt
HA2HA.md
STATUS.md
claims/
sources/
tasks/
evidence/
contradictions/
questions/
decisions/
summaries/
```

### Human Authority

Agents may gather and synthesize. Humans accept findings, choose options,
approve recommendations, and decide whether evidence is sufficient.

## Hiring Loop Room

Use when recruiters, hiring managers, interviewers, and agents coordinate a
candidate process.

### Flow

```txt
human creates candidate room in UI
  -> MDSync creates interview plan, scorecard, follow-up, and decision tasks
  -> agents prepare packets and summarize approved notes
  -> interviewers add feedback and evidence
  -> UI shows missing feedback, blockers, and decision readiness
  -> hiring manager approves next step, rejection, or offer packet
```

### Workspace Shape

```txt
HA2HA.md
STATUS.md
candidate/
interview-plan/
scorecards/
tasks/
evidence/
follow-ups/
decisions/
approvals/
```

### Human Authority

Agents may prepare and summarize. Humans own evaluation, hiring decisions,
candidate communication, compensation commitments, and final approvals.

## Grant, Application, Or Legal Packet Room

Use when forms, evidence, draft answers, review questions, and submission state
must be coordinated across sessions and reviewers.

### Flow

```txt
human creates packet room in UI
  -> MDSync creates sections, required documents, evidence, and review tasks
  -> agents draft answers and map missing proof
  -> UI shows incomplete sections, sensitive claims, and approvals
  -> humans approve final answers and attachments
  -> final packet export preserves submission contents and evidence trail
```

### Workspace Shape

```txt
HA2HA.md
STATUS.md
sections/
attachments/
tasks/
evidence/
questions/
decisions/
approvals/
submission/
```

### Human Authority

Agents may draft and assemble. Humans approve legal, financial, compliance, or
public commitments before submission.

## Product Requirements

Vertical rooms imply product features above raw workspace hosting:

- template-driven room creation
- task generation from uploaded or structured inputs
- agent inbox entries filtered by room, role, capability, and visibility
- human review queues for questions, evidence gaps, and approval requests
- internal versus external visibility controls
- final packet export
- room-specific dashboards over the same workspace records
- audit events for publication, submission, customer visibility, and risk
  acceptance

Provider adapters should be added only after the room flow proves value with
manual or semi-manual pilots.

## v4 Versus Future Tracks

These rooms belong in v4 because they use team identity, dashboards,
dashboard-authored work, service accounts, agent inboxes, audit events, and
human approval gates.

A later v5 could package one or more verticals as commercial product lines.
That should not move the reusable cross-boundary flow out of v4. v4 remains the
hosted control-plane substrate that makes those rooms possible.

## Open Validation Questions

- Which room has the clearest first buyer?
- Which room has the clearest before-and-after demo?
- Which room can be piloted manually before provider adapters exist?
- Which room requires strong privacy and approval controls before it is
  credible?
- Which agent actions are safe to automate, and which must stay human-owned?
- Which room-specific fields deserve future HA2HA profile standardization, and
  which should remain MDSync product metadata?
