# Core HA2HA Agent Alpha Trial

Machine-readable evidence:
[core-ha2ha-agent-alpha-trial-2026-07-08.json](core-ha2ha-agent-alpha-trial-2026-07-08.json)

## Summary

- Target URL: `http://localhost:3000`
- Workspace ID: `8aexIZ0gscbw`
- Actors: `agent-context-a`, `agent-context-b`
- Result: passing

## Proven

- Published a v1 workspace with `scripts/upload-workspace.mjs`.
- Joined the same workspace through `GET /w/:workspaceId/raw`.
- Claimed `tasks/RS-TRIAL-001.md` through a versioned task-file update that
  set `state`, `owner`, and `updated_by`.
- Added `evidence/RS-TRIAL-001/agent-a-claim.md` with minimal v1 evidence
  metadata.
- Linked the evidence from the task through a versioned task-file update.
- Updated `STATUS.md` from the second actor context with `baseVersion`.
- Surfaced a first `409` conflict with latest target coordinate.
- Surfaced a second `409` conflict and stopped further writes from
  `agent-context-b`.

## Simulated

The two agent contexts were represented by isolated actor handles and
independent `baseVersion` snapshots inside one operator-run script, not two
separate Codex threads.

## Unproven

- Deployed MDSync target.
- v3 leases, approvals, review gates, trust profile, and engineering-profile
  conformance.
