# @ha2ha/client

Portable HA2HA v1 client SDK for local folders and conformant HTTP
implementations.

## Install

```bash
npm install @ha2ha/client
```

During pre-publication development, install the packed tarball from this
package instead of the npm registry.

## API

```ts
import {
	createHa2haClient,
	createHttpTransport,
	createLocalFolderTransport,
} from "@ha2ha/client";

const client = createHa2haClient({
	actor: "codex-pax",
	transport: createLocalFolderTransport({ rootDir: "./workspace" }),
});

const task = await client.claimTask({ taskId: "RS-001" });
```

All methods return structured results:

```ts
type Ha2haResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: Ha2haClientError };
```

`version_conflict` errors include the latest target coordinate.

## Boundary

This package may depend on `@ha2ha/protocol`. It must not depend on MDSync
product packages, dashboards, comments, auth, stats, admin, DB, UI, or provider
sync.
