# MDSync Conformance Plan

MDSync is the first HA2HA implementation. v1 work should turn the v0 demo/reference app into a measured conformance target.

## Package Direction

Target packages:

```txt
packages/ha2ha-protocol   # schemas, constants, examples, validators
packages/ha2ha-http       # HTTP profile helpers, client, conformance checks
```

The protocol package must be useful without running MDSync. MDSync consumes the protocol package rather than defining the protocol inside product code.

## Docs Site

`apps/ha2ha` should present the protocol independently and link to MDSync as the first implementation.

The site should include:

- protocol overview
- workspace convention
- HTTP profile
- schemas
- examples
- conformance instructions
- implementation notes

## Implementation Steps

1. Extract constants for canonical filenames, paths, task states, and headers.
2. Add JSON schemas for manifest, task frontmatter, events, and file versions.
3. Add valid and invalid example workspaces.
4. Add a validator package API.
5. Add a validator CLI.
6. Add HTTP conformance checks.
7. Run conformance checks against local MDSync.
8. Publish the first conformance evidence artifact.

## MDSync Gaps To Close

- Replace any remaining old protocol-facing names with HA2HA names before public release.
- Persist event records for meaningful workspace changes.
- Persist durable file-version records.
- Expose event/history HTTP profile routes.
- Validate canonical workspace files when users opt into HA2HA conformance.
- Document which conformance profiles MDSync claims.

## Non-Goals

The conformance plan does not require MDSync to build comments, stats dashboards, diff/restore UI, user accounts, admin consoles, token rotation UX, encryption UX, or per-workspace database isolation. Those are v2 product features.
