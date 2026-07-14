# Task Claim Idempotency And Races

This document defines how HA2HA v1 handles task-claim races and what it does
not yet guarantee.

v1 uses optimistic concurrency on versioned task files. It does not use locks,
leases, idempotency keys, or a dedicated claim service.

## Current Authority

The v1 authority chain is:

- [ha2ha-protocol.md](ha2ha-protocol.md): every file has a current version;
  existing-file updates and deletes must include the caller's `baseVersion`.
- [workspace-conventions.md](workspace-conventions.md): a task claim is a
  versioned update to `tasks/<id>.md` that sets `state`, `owner`, and
  `updated_by`.
- [http-profile.md](http-profile.md): stale `baseVersion` writes return
  `409 Conflict` with the latest file version and enough data for intentional
  merge.
- [schemas-and-validation.md](schemas-and-validation.md): minimal claim
  metadata is validated for examples and operation files.
- [Historical core HA2HA agent alpha](skills/core-ha2ha-agent-alpha/REFERENCE.md):
  agent workflows read the target file immediately before writing, retry at
  most once after a conflict, and stop on repeated conflict.

## Race Scenario

If two agents decide to work on the same ready task before either can mark it as
claimed:

1. Both agents read `tasks/RS-123.md` at version `7`.
2. Both prepare a claim update that sets:

```yaml
state: claimed
owner: <actor>
updated_by: <actor>
```

3. Agent A submits the full task file with `baseVersion: 7`.
4. Agent B submits the full task file with `baseVersion: 7`.
5. The implementation may accept only one write because the current file version
   can advance only once from version `7`.
6. The winning write creates version `8`.
7. The losing write receives `409 version_conflict` with the latest task file.
8. The losing agent reads the latest task. If `owner` is another actor, it stops
   and surfaces the conflict to the human unless the task text explicitly permits
   takeover.

This is first-writer-wins at the file-version boundary. The claim decision may
race, but the persisted task state should not silently fork.

## Implementation Mapping

MDSync enforces the race boundary with a conditional update against the current
file version:

```sql
update workspace_files
set version = version + 1, updated_by = ?, updated_at = ?
where workspace_id = ? and path = ? and version = ?
```

The relevant implementation lives in
[apps/server/src/workspaces/routes.ts](../../apps/server/src/workspaces/routes.ts).
When the conditional update changes zero rows, the server deletes the unused
uploaded object best-effort and returns the latest file through the HA2HA
conflict response.

The `workspace_files` table is keyed by `(workspace_id, path)`, and durable
history uses `(workspace_id, path, version)`.

## Idempotency Boundary

v1 is conflict-safe, not exactly-once.

The same successful claim request replayed with the same `baseVersion` does not
return the original success as an idempotent replay. It returns a conflict
because the file has already advanced.

Clients should interpret that conflict intentionally:

- If the latest task has the same `owner`, the earlier claim probably already
  landed.
- If the latest task has a different `owner`, another actor won the race.
- If the latest task changed in unrelated ways, the agent may merge once and
  retry once when the change is not an ownership conflict.
- After a second `409`, the agent must stop and surface the target coordinate to
  the human.

The v1 protocol does not define idempotency keys, operation ids, duplicate
request detection, or exactly-once delivery.

## What V1 Does Not Enforce

v1 does not provide:

- claim leases
- stale-claim recovery
- server-side semantic task state transition checks
- server-side parsing of task frontmatter during generic file writes
- multi-file transaction semantics
- dedicated claim or handoff endpoints
- idempotency keys or duplicate-operation replay detection
- portable approval, review, or required-check gates

The server enforces file version conflicts. Well-behaved HA2HA clients enforce
the claim rule by reading the latest task and refusing to overwrite another
actor's ownership.

## Evidence And Conformance

Current conformance checks cover actor attribution, `baseVersion` enforcement,
stale update conflict responses, target-coordinate readback, delete
`baseVersion` behavior, events, and file history.

The core agent alpha trial also simulated two independent actor contexts and
proved first-conflict surfacing plus second-conflict stop behavior.

Known gap: there is not yet a dedicated concurrent two-agent claim integration
test that asserts only one actor can persist a claim for the same task version.

## Future Hardening

The v3 coordination profile is where stronger collaboration semantics belong.
Future work should add:

- a first-class claim operation with an `operationId`
- server-side task-frontmatter validation for claim writes
- allowed state transition checks in the same conditional write
- optional claim leases and lease expiry rules
- stale-claim recovery policy
- idempotent replay semantics for duplicate claim requests
- valid and invalid fixtures for concurrent claims, stale leases, and ownership
  takeover attempts
- conformance checks against a running implementation

Until then, the durable v1 guarantee is optimistic file concurrency with
human-visible conflict handling.
