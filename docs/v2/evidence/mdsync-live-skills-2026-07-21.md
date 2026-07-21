# Live MDSync Skill Acceptance — 2026-07-21

## Outcome

**PASS** against `https://sync-api.ha2ha.md` using eight isolated `codex exec --ephemeral` agents and public skills pinned to `v0.1.5` (`140541f200723f3ef5e1a3c0273f67f39b533b3e`).

No capability URL or token is included in this artifact. The edit capability was revoked after verification; the Viewer capability remains readable and was returned only to the initiating user.

## Agent results

| Role | Outcome | Result |
| --- | --- | --- |
| publisher | pass | workspace-created |
| viewer | pass | viewer-read-mutation-denied |
| builder-a | pass | independent-task-complete |
| builder-b | pass | independent-task-complete |
| racer-a | pass | race-conflict-preserved |
| racer-b | pass | race-winner |
| reviewer | pass | comment-lifecycle-product-only |
| protocol-auditor | pass | portable-protocol-valid |

## Independent verification

- Discovery origins agree and the manifest is HA2HA 1.0.0 with baseVersion-required.
- Builders completed independent tasks with stable actors, preserved adjacent state, and linked evidence targeting claim version 2.
- The synchronized race produced one version-2 owner, preserved the losing conflict, and retained version-1 history.
- The anchored comment lifecycle appears in product activity and remains absent from portable HA2HA events.
- Viewer mutation was denied; the edit capability was revoked and denied while Viewer reads remained available.

## Security

- Capability handoffs used separate mode-0600 files.
- Exact-secret and capability-pattern scans passed across agent output, temporary files, hosted files, comments, activity, events, and evidence.
- No agent command event referenced the robosync checkout, workspace packages, or repository helper scripts.
- The old edit credential was denied after revocation while Viewer reads remained successful.

## Command

`pnpm run test:mdsync-live-skills`
