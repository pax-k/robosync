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

### HTTP Profile

An implementation supports the required HTTP routes, status codes, conflict response shape, and `X-HA2HA-*` headers.

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
- update a file with `baseVersion`
- force a stale write and expect `409`
- validate task frontmatter
- validate workspace manifest
- validate events when the event profile is enabled
- validate file history when the history profile is enabled

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
