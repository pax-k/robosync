# Team Workspace Pilot

## Status

V2 includes a limited team-workspace product pilot. It proves human visibility
over a shared HA2HA workspace, not full v3 engineering-team collaboration.

## Pilot Scenario

The pilot scenario is one human reviewer and two separate agent contexts
handing off one workspace task:

- `human-reviewer` creates or reviews the workspace.
- `agent-context-a` updates `STATUS.md` and leaves the handoff state.
- `agent-context-b` claims `tasks/TEAM-001.md` and writes evidence under
  `evidence/TEAM-001/`.
- The human reviewer inspects activity, history, comments, task state, evidence,
  and capability status through the MDSync product UI.

The workspace shape stays inside current HA2HA v1 conventions:

```txt
STATUS.md
tasks/TEAM-001.md
evidence/TEAM-001/typecheck.md
.ha2ha/workspace.json
```

## Skill Surface

The pilot uses the repo-local v1 core HA2HA agent alpha:

- `docs/v1/skills/core-ha2ha-agent-alpha/SKILL.md`
- `docs/v1/tasks/V1-008-core-ha2ha-agent-skill-alpha.md`

It does not use product-private agent behavior. Agent workflows are modeled as
version-aware HA2HA file updates with `baseVersion`, protocol events, task-file
state, and evidence files.

No installable HA2HA skill package or MDSync product skill package is claimed by
this pilot. Those remain tracked separately:

- `docs/v1/tasks/V1-011-ha2ha-installable-skill-package.md`
- `docs/v2/tasks/V2-009-mdsync-installable-skill-package.md`

## Product Visibility Proven

The V2 UI lets a human inspect:

- activity from two agent contexts
- file history and historical preview for `STATUS.md`
- comments anchored to the handoff file
- task state parsed from `tasks/TEAM-001.md`
- evidence file visibility through workspace paths and activity selection
- read/edit capability status
- import/export and retention controls from the admin surface

Automated evidence lives in `tests/e2e/web-workspace.spec.ts` under
`web app exposes a limited team workspace pilot across agents and human review`.

## Remaining V3 Gaps

The pilot does not claim the future v3 engineering-team profiles. Remaining
gaps include:

- claims and leases with expiry semantics
- trust, delegation, and human-agent pair identity
- approvals and blocking review gates
- structured evidence/review profile validation
- engineering references for repositories, branches, commits, pull requests,
  checks, deployments, and incidents
- required-check freshness and enforcement
- provider adapters for GitHub, CI, issue trackers, chat, and deploy systems
- team ownership, roles, billing, audit identity, and aggregate admin

The pilot is enough to prove that current v2 human visibility is useful for a
small team handoff. It is not enough to launch the v3 engineering-team product.
