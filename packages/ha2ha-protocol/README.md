# @ha2ha/protocol

HA2HA protocol constants, schemas, examples, validation API, and validator CLI.

v1 remains the core workspace/file/version/conflict substrate. v3 adds optional
human-agent collaboration profile schemas and validation for coordination,
trust, evidence/review, governance, engineering, and method contracts.

## Install

```bash
npm install @ha2ha/protocol
```

During pre-publication development, install the packed tarball from this
package instead of the npm registry.

## API

```ts
import {
	HA2HA_PATHS,
	HA2HA_V3_PROFILES,
	ha2haTaskFrontmatterSchema,
	validateHa2haV3Workspace,
	validateHa2haWorkspace,
} from "@ha2ha/protocol";
```

Use this package for portable HA2HA workspaces. It has no dependency on MDSync
product UI, auth, storage, comments, stats, or dashboards.

## v3 Profiles

Use `validateHa2haV3Workspace()` when a workspace claims v3 profiles in
`.ha2ha/workspace.json`.

The current v3 surface includes:

- typed profile, method, and failure-class constants.
- schemas for the first method slice: `workspace.validate`, `task.claim`,
  `task.handoff`, `evidence.add`, and `review.comment`.
- schemas for coordination, trust/delegation, evidence/review,
  governance/audit/proof-of-work, and engineering profile records.
- fixture validation for independent profile claims and the engineering-team
  pilot workspace.
- negative validation for missing required method contracts, blocked completion,
  secret leakage, and provider-payload leakage.

v3 does not require real-time delivery, one auth provider, raw chain-of-thought,
provider-private payloads, or MDSync product routes.

## CLI

```bash
ha2ha-validate ./workspace
ha2ha-validate --v3 ./workspace
```

The CLI prints machine-readable JSON with `ok`, `results`, and structured
validation issues. `--v3` preserves the v1 checks and adds validation for any
claimed v3 profile records.

## Examples

Valid and invalid example workspaces are included under `examples/` so package
consumers can run validation without cloning the monorepo.

## Maturity

This is the first registry-ready HA2HA protocol package. Publication may still
be deferred; use package dry-run and empty-project install smoke evidence
before claiming registry availability.
