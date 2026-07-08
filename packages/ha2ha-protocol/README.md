# @ha2ha/protocol

HA2HA v1 protocol constants, schemas, examples, validation API, and validator
CLI.

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
	ha2haTaskFrontmatterSchema,
	validateHa2haWorkspace,
} from "@ha2ha/protocol";
```

Use this package for portable HA2HA workspaces. It has no dependency on MDSync
product UI, auth, storage, comments, stats, or dashboards.

## CLI

```bash
ha2ha-validate ./workspace
```

The CLI prints machine-readable JSON with `ok`, `results`, and structured
validation issues.

## Examples

Valid and invalid example workspaces are included under `examples/` so package
consumers can run validation without cloning the monorepo.

## Maturity

This is the first registry-ready HA2HA v1 package. Publication may still be
deferred; use package dry-run and empty-project install smoke evidence before
claiming registry availability.
