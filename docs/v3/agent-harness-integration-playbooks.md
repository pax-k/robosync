# Agent Harness Integration Playbooks

## Status

Source mode: founder-fed plus repository evidence.

This is v3 product and protocol direction. It describes how diverse teams using
different AI models, agent harnesses, agent frameworks, and internal systems
can coordinate through HA2HA and MDSync without standardizing on one agent
runtime.

Named frameworks are examples of integration targets. HA2HA should depend on
adapter contracts and workspace records, not on framework-private API shapes.

## Core Position

HA2HA is the shared collaboration-state layer.

MDSync is the hosted implementation, human UX, and skill/control surface.

Agent harnesses and frameworks remain systems of action. They execute work,
call tools, manage local memory, stream responses, run workflows, or operate
inside product infrastructure. They do not become the shared source of truth
for team collaboration.

The integration promise is:

```txt
different humans using different agents can still share one inspectable,
versioned, evidence-bearing work object
```

## Layer Responsibilities

| Layer | Responsibility | Should Not Own |
| --- | --- | --- |
| AI models | reasoning, drafting, review, summarization, classification | durable team state |
| Coding agents such as Codex, Claude Code, Cursor, and IDE agents | local repo work, terminal commands, worktrees, code review, skill execution | cross-team source of truth |
| Agent frameworks such as Cloudflare Agents SDK, Vercel eve, Vercel AI SDK, Mastra, and internal harnesses | durable agent execution, tools, workflows, memory, approvals, observability | portable HA2HA semantics |
| HA2HA protocol | workspace records, file/version semantics, claims, evidence, handoffs, decisions, review and approval profiles | provider-specific execution |
| MDSync | hosted workspace, browser UX, raw/API routes, auth, history, dashboards, comments, skills, provider sync | replacing every agent runtime |
| Git, CI, issue trackers, deployment tools, and chat | source control, checks, issues, deploys, announcements, conversations | agent-readable work ledger |

## Integration Modes

### Skills Mode

Use when a human is driving an agent surface such as Codex, Claude Code, Cursor,
or another coding assistant.

The skill teaches the agent to:

- join a workspace
- read context
- claim a task
- update one file with `baseVersion`
- add evidence
- record decisions
- hand off work
- stop on repeated conflicts

This mode is ideal for solo builders, engineering teams, contractors, and
reviewers who already work inside agent-assisted coding tools.

### Tool Adapter Mode

Use when an agent framework or internal harness needs typed tools.

The adapter exposes stable functions such as:

- `ha2ha.readWorkspace`
- `ha2ha.readFile`
- `ha2ha.claimTask`
- `ha2ha.updateFile`
- `ha2ha.addEvidence`
- `ha2ha.recordDecision`
- `ha2ha.handoff`
- `ha2ha.requestReview`
- `ha2ha.recordCheck`

This mode fits Cloudflare Agents SDK, Vercel eve, Vercel AI SDK, Mastra,
internal TypeScript services, scheduled workers, and workflow engines.

Current implementation status: these tool names are target adapter contracts,
not shipped MDSync product SDK methods. v1 now provides tarball-installable
`@ha2ha/protocol`, `@ha2ha/http`, and `@ha2ha/client` packages for portable
protocol adoption. A first-party MDSync client or adapter package must exist
before MDSync claims that external harnesses can integrate through hosted
product tools.

The same distinction applies to skills. The portable protocol skill now ships as
`@ha2ha/skills`; MDSync product skills remain separate. Installable first-party
skill packages should split into:

- HA2HA skills: protocol-only workflows for local folders or conformant
  implementations.
- MDSync skills: hosted product workflows for MDSync routes, tokens, dashboards,
  comments, history, provider sync, and team-pilot onboarding.

### Local-First Mode

Use when a workspace starts as files on disk.

Agents edit a local HA2HA folder, run validators, and sync through Git,
Dropbox, Syncthing, MDSync import, or another transport later.

This mode fits sensitive work, solo work, repo-native planning, local
experiments, and teams that want protocol adoption before hosted product
adoption.

### MDSync Control-Plane Mode

Use when humans need operational visibility.

MDSync shows:

- current status
- active owners
- stale claims
- blocked tasks
- missing evidence
- failed checks
- unresolved review comments
- approvals
- release or incident readiness

Agents still operate in their own harnesses. MDSync makes the shared work state
visible and governable.

### Provider-Sync Mode

Use when external systems need to be reflected in the workspace.

Adapters sync references or summaries from:

- GitHub or GitLab pull requests
- CI checks
- issue trackers
- deployment systems
- incident tools
- chat approvals or notifications

The external system remains authoritative for its domain. HA2HA records the
portable reference, evidence, decision, and readiness state.

## Harness-Specific Fit

### Codex Or Claude Code

Best fit: skills mode.

The agent reads the workspace before acting, operates in a local repo or
worktree, writes evidence, and updates task state through MDSync or a local
HA2HA folder.

Useful commands or skill workflows:

- `join-workspace`
- `read-context`
- `claim-task`
- `add-evidence`
- `handoff`
- `review-task`
- `close-task`

### Cloudflare Agents SDK

Best fit: tool adapter mode plus provider-sync mode.

A stateful Cloudflare agent can watch workspace events, poll provider APIs,
run scheduled validation, summarize incidents, or coordinate background tasks.
It should write only through HA2HA tools that enforce actor attribution,
allowed paths, `baseVersion`, evidence output, and stop conditions.

### Vercel eve And Vercel AI SDK

Best fit: tool adapter mode.

A Vercel-hosted agent or workflow can call HA2HA tools from durable steps,
request human approval before high-risk writes, and record check or deployment
evidence back into the workspace.

The agent framework owns execution. HA2HA owns the portable work result.

### Mastra

Best fit: tool adapter mode plus workflow mode.

Mastra agents and workflows can use HA2HA as the durable collaboration record
while keeping framework memory, routing, and observability internal. Final
decisions, task state, handoffs, checks, and evidence should be projected into
the workspace.

### Internal Harnesses

Best fit: protocol adapter mode.

An internal agent platform should integrate at the contract boundary:

- validate workspace records
- call raw/API routes or local filesystem adapters
- preserve `baseVersion` behavior
- emit structured evidence
- map internal identities to HA2HA participants
- document unsupported profiles

## State Boundary

| State | Source Of Truth | HA2HA Treatment |
| --- | --- | --- |
| private model reasoning | agent harness | do not store |
| tool traces and raw logs | harness or observability system | summarize as evidence when useful |
| code changes | Git working tree and Git provider | reference branch, commit, PR, and checks |
| CI results | CI provider | record check summary, target, timestamp, and link |
| deployment state | deployment provider | record deployment evidence and decision state |
| task ownership | HA2HA task files | protocol-owned when profile is claimed |
| handoff state | HA2HA task or handoff records | protocol-owned |
| decisions | HA2HA decisions | protocol-owned |
| review blockers | HA2HA review records when profile is claimed | protocol-owned |
| approvals | HA2HA approval records when profile is claimed | protocol-owned |
| dashboards and notifications | MDSync product | product-owned view over protocol records |

Do not copy provider payloads wholesale into HA2HA. Store stable references,
summaries, evidence, timestamps, actors, and target coordinates.

## Adapter Requirements

Any harness integration should follow these rules:

- Read `HA2HA.md`, `STATUS.md`, the participant file, target task, linked
  decisions, and existing evidence before mutating work.
- Use a stable actor handle for every write.
- Map agent actions to a human-agent pair when the trust profile is claimed.
- Declare allowed write paths before the agent acts.
- Require `baseVersion` for updates and deletes.
- Retry at most once after a version conflict.
- Stop after a second conflict and surface the latest target coordinate.
- Write evidence for meaningful changes.
- Summarize raw logs instead of dumping secrets or oversized output.
- Never store raw tokens, private credentials, or model-private reasoning.
- Validate workspace records before claiming compatibility.
- Record unsupported profiles explicitly.

## Playbook Matrix

| Scenario | Participants | Primary Integration | HA2HA Value |
| --- | --- | --- | --- |
| Solo builder switching agents | one human, multiple local agents | skills mode | durable task, decision, evidence, and handoff state |
| Pair programming with different agents | two engineers, two coding agents | skills mode | shared task ownership and conflict-aware updates |
| Same-branch hotfix swarm | several humans and agents | skills plus control plane | narrow claims, leases, evidence, and steward visibility |
| Parallel feature delivery | frontend, backend, QA, docs agents | skills plus provider sync | cross-task readiness and blocked-work visibility |
| PR review memory | reviewer, author agent, repair agent | provider sync plus evidence/review | unresolved feedback and proof survive outside Git provider UI |
| Release readiness | lead, CI, deploy adapter, reviewer agents | control plane plus provider sync | checks, approvals, rollback notes, and blockers in one ledger |
| Incident response | humans, observability agent, remediation agent | framework adapter plus control plane | timeline, hypotheses, mitigations, decisions, and follow-ups |
| Contractor or partner workspace | internal owner, external contributor, agents | scoped MDSync workspace | controlled sharing without full repo or chat access |
| Non-engineering delivery room | ops, sales, customer success, agents | skills plus control plane | drafts, questions, approvals, and evidence in one work object |

## Real-World Flows

### 1. Solo Cross-Agent Handoff

1. A builder creates a workspace for a feature or investigation.
2. Codex claims a task, works locally, records evidence, and writes a handoff.
3. Later, Claude Code or another agent joins the workspace and reads the
   current task, evidence, decisions, and handoff.
4. The second agent continues without relying on the first chat transcript.
5. MDSync shows current status and missing evidence.

### 2. Parallel Engineering Team

1. The lead creates a feature workspace with one task per backend, frontend,
   QA, docs, and migration lane.
2. Each engineer uses their preferred agent.
3. Agents claim tasks using `baseVersion`.
4. Provider adapters record branch, PR, issue, check, and deployment
   references.
5. Reviewers add comments and approvals.
6. MDSync shows which lanes are done, blocked, stale, or missing evidence.

### 3. Same-Branch Hotfix Swarm

1. A release branch is declared in the workspace manifest.
2. Tasks divide ownership by path, module, test lane, or investigation lane.
3. Agents must claim before editing and include short leases.
4. Every write records evidence and check status.
5. A human branch steward watches MDSync for conflicts, stale claims, and
   release readiness.
6. The branch is merged or deployed only after required evidence and approvals
   exist.

### 4. Productized Background Agent

1. A Cloudflare, Vercel, Mastra, or internal agent receives an event or schedule.
2. It reads the workspace and checks whether it has authority to act.
3. It calls HA2HA tools instead of writing arbitrary product-private state.
4. It records evidence, check results, or questions.
5. If the action needs approval, it creates an approval request instead of
   executing directly.
6. MDSync presents the pending decision to humans.

### 5. Incident Or Release Room

1. Humans create a workspace for an incident or release.
2. Background agents gather logs, check provider status, summarize evidence,
   and create follow-up tasks.
3. Humans approve mitigations, rollback, deploy, or close decisions.
4. MDSync preserves the timeline, evidence, owners, decisions, and unresolved
   follow-up work.

### 6. External Collaboration

1. A team creates a scoped workspace for a contractor, client, maintainer, or
   partner.
2. External participants receive only the paths and permissions they need.
3. Their agents can ask questions, add evidence, or respond to reviews.
4. Internal systems such as private repos, Slack, or full issue trackers stay
   hidden.
5. The shared workspace remains inspectable and exportable.

## MDSync Skills Versus HA2HA Protocol

HA2HA compatibility should not require MDSync.

A team can adopt the file layout, schemas, validators, and HTTP profile in a
local folder, internal service, desktop app, or competing hosted product.

MDSync skills are a product acceleration path:

- they know the hosted routes
- they handle tokens and raw links
- they apply the conflict policy
- they produce evidence in the expected shape
- they make existing agents useful without custom integration work

The ideal first-party package should support two modes:

- protocol mode: works against local HA2HA folders or any conformant
  implementation
- MDSync mode: uses hosted MDSync routes, auth, dashboards, comments, history,
  and provider adapters

As of 2026-07-08, the protocol mode is implemented as installable v1 packages:
`@ha2ha/protocol`, `@ha2ha/http`, `@ha2ha/client`, and `@ha2ha/skills`.
MDSync mode remains product work tracked in
`docs/v2/tasks/V2-009-mdsync-installable-skill-package.md` and
`docs/v2/tasks/V2-010-mdsync-client-sdk.md`.

## Non-Goals

- Do not make HA2HA depend on one model provider.
- Do not make HA2HA depend on one agent framework.
- Do not require every participant to run an online agent server.
- Do not make MDSync the only valid implementation.
- Do not store private chain-of-thought or raw credentials as workspace
  evidence.
- Do not treat provider payloads as portable protocol records.
- Do not claim v3 engineering governance until schemas, fixtures, validators,
  and conformance checks exist.

## First Useful Product Slice

The smallest credible heterogeneous-agent demo is:

1. Create one MDSync workspace for a repo task.
2. Agent A joins through a Codex or Claude skill.
3. Agent B joins through another harness or tool adapter.
4. Agent A claims a task, writes evidence, and leaves a handoff.
5. Agent B continues from the handoff and records a check result.
6. A human reviews the workspace in MDSync.
7. A forced conflict proves the second-conflict stop rule.

That demo proves the differentiated product claim: the team can use different
agents without losing shared state.

## Open Decisions

- Which adapter ships first: Codex skill, Claude skill, Cloudflare tool,
  Vercel/eve tool, Mastra tool, or generic CLI?
- Should first-party tools expose both protocol mode and MDSync mode from day
  one?
- Should HA2HA and MDSync skills ship as two packages from day one, or as one
  package with separate protocol and product modules?
- Which profiles must be present before provider-sync adapters are marketed?
- How should MDSync display framework-specific agent identity without making
  that identity protocol-specific?
- What evidence is required before claiming that two different agent harnesses
  can safely coordinate through one workspace?
