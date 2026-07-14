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

## Publish And Hand Off

```ts
import {
	createMdsyncClient,
	createMdsyncClientFromUrl,
} from "@mdsync/client";

const publisher = createMdsyncClient({
	apiOrigin: "https://api.example.com",
	actor: "agent-context-a",
	webOrigin: "https://app.example.com",
});

const created = await publisher.createHa2haWorkspace({
	actor: "agent-context-a",
	files: [
		{
			content: `---
id: HANDOFF-001
title: Complete the handoff
state: ready
owner: null
---
`,
			path: "tasks/HANDOFF-001.md",
		},
	],
	title: "Agent handoff",
});

if (!created.ok) {
	throw new Error(created.error.code);
}

// Return these once to the initiating human. Treat both as bearer secrets.
const viewerUrl = created.data.workspaceUrl;
const collaboratorUrl = created.data.editUrl;
if (!collaboratorUrl) {
	throw new Error("Missing Collaborator URL.");
}

// A second agent needs only the pasted URL and a stable actor handle.
const connection = await createMdsyncClientFromUrl({
	actor: "agent-context-b",
	url: collaboratorUrl,
});
if (!connection.ok) {
	throw new Error(connection.error.code);
}

const ha2ha = connection.data.client.createHa2haClient();
if (ha2ha.ok) {
	await ha2ha.data.claimTask({ taskId: "HANDOFF-001" });
}
```

## Boundary

`@mdsync/client` depends one way on `@ha2ha/client`. It may wrap HA2HA file,
task, and evidence workflows, but product helpers do not redefine HA2HA
protocol semantics.

The client does not log tokens and does not include token values in structured
errors. Current auth support is capability-token based; identity sessions remain
future product work.

`createMdsyncClientFromUrl()` discovers the API from the pasted Web or raw URL
without forwarding its query string. It accepts HTTPS deployments and HTTP only
on localhost, rejects mixed `k` and `edit` capabilities, and keeps the token
encapsulated in the returned client. Installing this package or its skill does
not grant access to any workspace.
