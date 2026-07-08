# @ha2ha/http

HA2HA v1 HTTP profile conformance runner and CLI.

## Install

```bash
npm install @ha2ha/http
```

During pre-publication development, install the packed tarball from this
package instead of the npm registry.

## API

```ts
import { runHa2haHttpConformance } from "@ha2ha/http";

const result = await runHa2haHttpConformance({
	baseUrl: "http://localhost:3000",
});
```

## CLI

```bash
HA2HA_BASE_URL=http://localhost:3000 ha2ha-http-conformance
```

The CLI prints machine-readable JSON with the implementation target, claimed
profiles, checks, and pass/fail result.

## Boundary

This package measures HA2HA HTTP profile behavior. It does not implement MDSync
product UX, auth, comments, stats, admin, dashboards, or provider sync.
