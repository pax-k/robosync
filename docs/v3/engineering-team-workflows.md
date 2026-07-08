# Engineering Team Workflows

## Status

Source mode: founder-fed plus repository evidence.

This document describes how engineering teams could use HA2HA and MDSync with
their own agents once the v3 coordination, trust, evidence/review, and
engineering profiles exist. It is product and protocol direction, not current
v1 conformance.

## Introduction Version

The full engineering-team collaboration workflow belongs in v3.

Prerequisites land earlier:

- v0 proves MDSync can host and update Markdown workspaces.
- v1 introduces the core HA2HA skill alpha over validated protocol primitives.
- v2 introduces the hosted product UX needed for humans to inspect and govern
  shared workspaces.
- v3 introduces the engineering-team pilot once coordination, trust,
  evidence/review, and engineering profiles can be validated and enforced.

This sequencing lets teams dogfood pieces early without claiming that MDSync is
ready for engineering-team governance before the protocol and product gates
exist.

For the broader product workflow catalog, including solo engineering and
non-engineering workflows, see
[../v2/high-impact-workflows.md](../v2/high-impact-workflows.md).

## Core Model

Engineering teams use HA2HA as a shared work ledger around existing tools.

```txt
local repo + Git provider + CI + issue tracker + chat
  remain the systems of action

HA2HA workspace
  records shared context, work state, evidence, review, decisions, handoffs,
  approvals, and links to those systems
```

Each engineer can keep their own agent surface: Codex, Claude Code, Cursor,
internal agents, or custom automation. The common layer is not a shared agent
runtime. The common layer is a versioned, human-inspectable workspace plus
skills that teach each agent how to read and write it safely.

## Actors

- Engineering lead: creates or governs the workspace, approves sensitive work,
  and reviews readiness.
- Engineer: uses a local agent to perform code, review, testing, or
  investigation work.
- Agent: reads workspace context, claims tasks, updates task state, writes
  evidence, and leaves handoffs within delegated bounds.
- Reviewer: leaves anchored comments, asks questions, approves work, or blocks
  completion.
- Automation: syncs provider references, check status, deployment events, or
  notification state.

## Workspace Shape

A team engineering workspace should include:

```txt
HA2HA.md
STATUS.md
participants/
  <human-or-human-agent-pair>.md
tasks/
  <id>.md
decisions/
  <date-or-id>.md
evidence/
  <task-id>/
reviews/
  <review-id>.md
logs/
  YYYY-MM-DD.md
.ha2ha/
  workspace.json
```

The workspace manifest declares the claimed profiles, repositories, required
checks, authority rules, and route templates. Task files stay small so agents
can claim and update work without fighting over one large shared document.

## Team Lifecycle

### 1. Create A Workspace

The lead or an agent creates a workspace for a sprint, feature, incident,
release, migration, customer issue, or review queue.

The workspace starts with:

- purpose and scope in `HA2HA.md`
- current dashboard in `STATUS.md`
- participant files for humans, agents, and human-agent pairs
- task files with acceptance criteria and required evidence
- repository and provider references in `.ha2ha/workspace.json`

### 2. Agents Join With Skills

Each engineer installs a first-party skill pack. Their agent can then run
repeatable workflows such as:

```txt
ha2ha join <workspace-url>
ha2ha read-context
ha2ha claim tasks/ENG-042.md
ha2ha add-evidence tasks/ENG-042.md evidence/ENG-042/typecheck.md
ha2ha handoff tasks/ENG-042.md
ha2ha review tasks/ENG-042.md
ha2ha close tasks/ENG-042.md
```

The exact command names can change. The important requirement is that skills
perform version-aware reads and writes, respect path permissions, and leave
durable evidence.

### 3. Claim Work

Before making changes, an agent reads:

- `HA2HA.md`
- `STATUS.md`
- its participant file
- the target task file
- linked decisions and evidence
- required checks from the workspace manifest

The agent then claims the task by updating the task file with `baseVersion`.
The claim records owner, branch, lease, expected evidence, blockers, and
required review.

If another agent changed the same task, the conflict response forces an
intentional merge. A second conflict stops the workflow and asks for human
attention.

### 4. Work Locally

Code remains in the local repository. Branches, commits, pull requests, CI, and
deployments remain in their provider systems.

The HA2HA task file stores portable references:

- repository id
- branch
- commits
- issue ids
- pull request links
- required checks
- deployment links or environment names

Provider-specific API details stay behind MDSync adapters or local tooling.

### 5. Add Evidence

Agents write proof into `evidence/<task-id>/` instead of burying it in chat.

Evidence can include:

- command output summaries
- typecheck, lint, test, build, smoke, security, or deploy results
- screenshots or links to artifacts
- CI job links
- reproduction notes
- rollback notes
- manual verification notes

Evidence records should include actor, timestamp, environment, command or
source, result, and linked artifacts.

### 6. Review And Ask Questions

Reviewers can leave comments anchored to a task, file path, version, heading,
line, evidence record, pull request, or deployment reference.

Blocking comments prevent task completion when the workspace claims the
coordination and evidence/review profiles. Questions and responses become
portable records rather than disappearing in chat.

### 7. Handoff

When a human or agent stops work, the skill writes a handoff that includes:

- current state
- branch or pull request
- next action
- blockers
- decisions made
- evidence written
- checks still missing
- risks or review questions

Another engineer's agent can continue by reading the workspace without needing
private chat history.

### 8. Close Work

A task can move to `done` only when the claimed profiles allow it:

- acceptance criteria are satisfied
- required evidence exists
- required checks are passing and fresh
- blocking review comments are resolved
- approvals exist when required
- the final state links to the relevant branch, commit, pull request, issue, or
  deployment

The close action should update `STATUS.md` or the equivalent dashboard state.

## Collaboration Patterns

### Parallel Feature Work

Multiple engineers and agents split a feature into small task files. Each agent
claims one task, links to its branch and pull request, writes evidence, and
leaves handoffs. The shared workspace shows cross-task blockers and readiness.

### PR Review Memory

GitHub remains the code review surface. HA2HA records the review state that
should survive across agents: requested changes, unresolved threads, evidence
for fixes, approvals, and remaining risks.

### Release Readiness

A release workspace tracks required checks, migrations, deploy targets,
rollback plans, smoke evidence, approvals, known risks, and unresolved blockers.
The product UI can show what prevents release without replacing CI or the Git
provider.

### Incident Response

An incident workspace captures timeline, hypotheses, commands run, mitigations,
owners, follow-up tasks, evidence, and decisions. Agents can gather logs and
summaries, while humans retain inspectable authority over decisions.

### External Collaboration

A contractor, client, maintainer, or partner can receive a scoped workspace
instead of full repo or chat access. They can inspect tasks, evidence, and
decisions, and their agent can contribute within explicit path and authority
limits.

## First-Party Skill Pack

The first engineering-team skill pack should include:

- `publish-workspace`
- `join-workspace`
- `read-context`
- `claim-task`
- `update-task`
- `add-evidence`
- `record-decision`
- `handoff`
- `review-task`
- `close-task`
- `sync-pr-status`

Each mutating skill must define:

- allowed workspace paths
- required token or identity scope
- conflict handling behavior
- evidence output
- stop conditions
- whether human approval is required before publish, merge, deploy, or close

## Product UI

The hosted MDSync product should make the workspace operational for humans:

- current status and next required action
- active tasks and owners
- stale claims and expired leases
- blockers and questions
- missing or stale evidence
- failed or missing checks
- unresolved review comments
- approval state
- release or incident readiness
- provider links to repositories, branches, pull requests, checks, issues, and
  deployments

The UI can make the workflow easier, but the portable workspace records remain
the source of shared collaboration state.

## Boundaries

HA2HA should not replace:

- source control
- pull request review systems
- CI providers
- issue trackers
- deployment systems
- team chat
- local agent runtimes

HA2HA should standardize the portable collaboration record those tools do not
share cleanly across humans and agents.

MDSync should monetize hosted enforcement, visibility, retention, governance,
identity, integrations, and support. The portable protocol should stay open.

## Profile Mapping

| Need | HA2HA Profile | Product Layer |
| --- | --- | --- |
| Task ownership, blockers, handoffs, approvals | Coordination | dashboards, stale-claim recovery, enforcement |
| Human-agent identity and authority | Trust | org identity, RBAC, service accounts, audit logs |
| Evidence, review comments, questions, approvals | Evidence/review | review UI, approval workflows, evidence retention |
| Repos, branches, commits, issues, PRs, checks, deployments | Engineering | provider OAuth, sync adapters, readiness dashboards |

## MVP Path

The smallest credible engineering-team demo is:

1. Create a workspace from a repo or feature.
2. Two different agents join the workspace.
3. Agent A claims and updates one task.
4. Agent A writes evidence and a handoff.
5. Agent B reads the workspace and continues from that handoff.
6. A human reviews the task, evidence, and current status in the browser.
7. A conflict is handled explicitly instead of silently overwriting state.

That demo proves the core promise:

```txt
my agent and your agent can coordinate on software work through the same
human-readable workspace
```
