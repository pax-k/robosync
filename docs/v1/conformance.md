# HA2HA Conformance

Conformance proves that an implementation supports HA2HA behavior without requiring consumers to reverse-engineer product code.

## Levels

### Core Workspace

An implementation supports:

- workspace identity
- raw workspace listing
- raw file reads
- per-file versions
- optimistic update conflict semantics
- canonical version headers
- actor attribution on mutating file writes
- versioned target coordinates using `workspaceId`, `path`, and `version`

### Workspace Convention

An implementation supports or preserves:

- `HA2HA.md`
- `.ha2ha/workspace.json`
- `participants/`
- `tasks/`
- `evidence/`
- `decisions/`
- `logs/`
- task frontmatter states
- minimal task claim metadata: `state`, `owner`, and `updated_by`
- minimal evidence metadata: linked task or target, kind, result, actor, and
  timestamp

### HTTP Profile

An implementation supports the required HTTP routes, status codes, conflict response shape, and `X-HA2HA-*` headers.

Core HTTP conformance requires `actor` on file updates and deletes. Deletes of
existing files must include `baseVersion`.

### Event And History Profiles

An implementation supports:

- `workspace_events`
- `workspace_file_versions`
- ordered event reads
- file-version listing
- historical file reads

## Conformance Checks

The conformance suite should:

- create or load a fixture workspace
- fetch raw listing
- fetch canonical files
- validate headers
- update a file with `actor` and `baseVersion`
- create a new file with `actor`
- delete a file with `actor` and `baseVersion`
- force a stale write and expect `409`
- validate versioned target coordinates in conflict metadata
- validate task frontmatter
- validate minimal claim and evidence metadata
- validate workspace manifest
- validate events when the event profile is enabled
- validate file history when the history profile is enabled

## Import, Export, And Snapshot Preservation

Import/export UX is not required for core conformance. If an implementation
claims import, export, or snapshot compatibility, conformance must verify that
v1 workspace data is preserved: canonical paths, file contents, manifests,
participants, tasks, evidence, decisions, logs, and claimed event/history
records.

## Evidence

Each run should produce machine-readable evidence:

```json
{
  "implementation": "mdsync",
  "target": "http://localhost:3000",
  "profile": "core-workspace",
  "ok": true,
  "checks": []
}
```

Measured implementation evidence:

- MDSync local conformance:
  [mdsync-conformance.md](mdsync-conformance.md)

## Failure Semantics

Conformance failures should identify:

- failed profile
- failed check id
- observed response or document path
- expected behavior
- whether the failure is blocking for a claimed profile

## Compatibility

Breaking public contract changes require:

- version bump
- migration notes
- updated schemas
- updated examples
- updated conformance checks
