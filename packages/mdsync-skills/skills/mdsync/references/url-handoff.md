# URL-Based HA2HA Handoff

## Publish

Use an unscoped client only to create the workspace. The actor must be an
explicit stable handle and every `tasks/*.md` file must contain valid HA2HA
frontmatter.

```js
import { createMdsyncClient } from "@mdsync/skills/runtime";

const productionWebOrigin = "https://mdsync-web-pax.pax.workers.dev";
const configuredApiOrigin = process.env.MDSYNC_BASE_URL?.trim();
let apiOrigin = configuredApiOrigin;
let webOrigin = productionWebOrigin;

if (!apiOrigin) {
  const response = await fetch(
    `${productionWebOrigin}/.well-known/mdsync.json`
  );
  if (!response.ok) throw new Error("MDSync discovery failed.");
  const discovery = await response.json();
  if (
    discovery.product !== "mdsync" ||
    discovery.discoveryVersion !== 1 ||
    typeof discovery.apiOrigin !== "string" ||
    typeof discovery.webOrigin !== "string"
  ) {
    throw new Error("Unsupported MDSync discovery response.");
  }
  apiOrigin = discovery.apiOrigin;
  webOrigin = discovery.webOrigin;
}

const setup = createMdsyncClient({ apiOrigin, webOrigin, actor });
const created = await setup.createHa2haWorkspace({
  actor,
  files,
  readAccess: "token",
  title,
  writeAccess: "token",
});
```

On success, label `workspaceUrl` as **Viewer URL** and `editUrl` as
**Collaborator URL**. Return them only in the direct response to the initiating
human. Do not copy them into files, comments, evidence, logs, or diagnostic
summaries.

## Join From A Pasted URL

```js
import {
  createMdsyncClientFromUrl,
  validateMdsyncHa2haManifest,
} from "@mdsync/skills/runtime";

const connection = await createMdsyncClientFromUrl({ actor, url });
if (!connection.ok) throw new Error(connection.error.message);

const overview = await connection.data.client.getOverview();
const manifest = await connection.data.client.readFile(".ha2ha/workspace.json");
const instructions = await connection.data.client.readFile("HA2HA.md");
if (!manifest.ok) throw new Error(manifest.error.message);
const validatedManifest = validateMdsyncHa2haManifest({
  content: manifest.data.content,
  workspaceId: connection.data.workspaceId,
});
if (!validatedManifest.ok) throw new Error(validatedManifest.error.message);
```

The helper requires `protocol: ha2ha`, `protocolVersion: 1.0.0`,
`conflictPolicy: baseVersion-required`, and the connected workspace ID. Read the
relevant participant and task files before acting. A `read`
connection may inspect only. An `edit` connection may create the hosted HA2HA
client, claim tasks, update files with `baseVersion`, and add evidence.

Stop after a second `version_conflict`. Preserve local and latest remote
contents for handoff instead of overwriting.

Use `listActivity()` for MDSync's combined human-facing product feed, including
comment creation and resolution. Use `listEvents()` only for portable HA2HA
events. Direct `@ha2ha/protocol` imports require installing that package
explicitly; the normal handoff flow needs only `@mdsync/skills/runtime`.

## HTTP Fallback

When the SDK is unavailable:

1. Parse `/w/<workspaceId>` from the pasted URL and retain either `k` or `edit`.
2. Fetch `/.well-known/mdsync.json` from the pasted origin without forwarding
   its query string.
3. Require `product: mdsync`, `discoveryVersion: 1`, and an origin match.
4. Use `k` only on read requests. Send `edit` as `Authorization: Bearer <token>`
   for mutations; never print the resulting command with the token expanded.
5. For publishing without an explicit `MDSYNC_BASE_URL`, start discovery at
   `https://mdsync-web-pax.pax.workers.dev/.well-known/mdsync.json`. POST to
   `<apiOrigin>/api/workspaces` with
   `protocol: {"kind":"ha2ha","version":"1.0.0"}`, an explicit actor, token
   read/write access, and valid task files.
6. Treat the returned Viewer and Collaborator URLs as bearer credentials and
   deliver them directly to the initiating human once.
