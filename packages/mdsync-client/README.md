# @mdsync/client

Hosted MDSync product client SDK.

Use this package when integrating with MDSync product routes: hosted workspace
creation, capability tokens, dashboard/raw links, comments, activity, history,
admin stats, import/export, and retention.

Use `@ha2ha/client` directly when the goal is portable HA2HA protocol adoption
against local folders or conformant HTTP implementations.

## Install

```bash
npm install @mdsync/client @ha2ha/client @ha2ha/protocol
```

## Example

```ts
import { createMdsyncClient } from "@mdsync/client";

const createClient = createMdsyncClient({
	apiOrigin: "https://api.example.com",
	actor: "agent-context-a",
	auth: { kind: "none" },
});

const created = await createClient.createWorkspace({
	files: [{ content: "# Status\n", path: "STATUS.md" }],
	title: "Agent handoff",
});

if (!created.ok) {
	throw new Error(created.error.message);
}

const editToken = new URL(created.data.editUrl ?? "").searchParams.get("edit");
if (!editToken) {
	throw new Error("Missing edit token.");
}

const workspaceClient = createMdsyncClient({
	apiOrigin: "https://api.example.com",
	actor: "agent-context-a",
	auth: { kind: "edit-token", token: editToken },
	workspaceId: created.data.id,
});

await workspaceClient.writeFile({
	baseVersion: 1,
	content: "# Status\n\nUpdated.\n",
	path: "STATUS.md",
});
```

## Boundary

`@mdsync/client` depends one way on `@ha2ha/client`. It may wrap HA2HA file,
task, and evidence workflows, but product helpers do not redefine HA2HA
protocol semantics.

The client does not log tokens and does not include token values in structured
errors. Current auth support is capability-token based; identity sessions remain
future product work.
