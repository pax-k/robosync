# MDSync HA2HA Conformance

MDSync is the first measured HA2HA implementation.

## Current Claim

As of the local conformance run on 2026-07-08, MDSync claims these HA2HA v1
profiles:

- `core-workspace`
- `workspace-convention`
- `http-profile`
- `event-profile`
- `file-history-profile`

Current machine-readable evidence:

- Local:
  [evidence/mdsync-local-conformance-2026-07-08.json](evidence/mdsync-local-conformance-2026-07-08.json)
- Deployed:
  [evidence/mdsync-deployed-conformance-2026-07-08.json](evidence/mdsync-deployed-conformance-2026-07-08.json)

## Evidence Summary

- Target URL: `http://localhost:3000`
- Timestamp: `2026-07-08T18:42:47.286Z`
- Result: passing
- Checks: 17 passing, 0 failing
- Deployed target URL: `https://mdsync-server-pax.pax.workers.dev`
- Deployed timestamp: `2026-07-08T18:59:41.248Z`
- Deployed result: passing
- Deployed checks: 17 passing, 0 failing

Required v1 behaviors covered by the run:

- actor attribution for updates: `file.update.requires-actor` and
  `file.update.actor-base-version`
- actor attribution for creates: `file.create.actor`
- actor attribution for deletes: `file.delete.requires-actor` and
  `file.delete.actor-base-version`
- delete `baseVersion` enforcement: `file.delete.requires-base-version`
- target-coordinate readback: `file.read-updated-target`
- conflict behavior with latest target coordinate: `file.update.conflict`
- event profile reads: `events.read` and `events.raw-read`
- file-history profile reads: `file-history.list` and `file-history.read`

## Import, Export, And Snapshot Preservation

MDSync does not currently claim HA2HA import, export, or snapshot preservation
compatibility.

That status does not weaken the protocol requirement. If MDSync later claims
any import, export, or snapshot compatibility, conformance evidence must prove
that v1 workspace data is preserved for every claimed profile: canonical paths,
file contents, manifests, participants, tasks, evidence, decisions, logs, and
claimed event/history records.

## Known Gaps

- Import/export/snapshot preservation is unclaimed. Owner: future product scope
  only if MDSync claims those capabilities.
