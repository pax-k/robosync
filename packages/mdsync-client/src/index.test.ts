import assert from "node:assert/strict";
import { test } from "node:test";

import { createMdsyncMockServer } from "../../../scripts/lib/mdsync-mock-server.mjs";
import { createMdsyncClient } from "./index";

const EDIT_TOKEN_QUERY_PATTERN = /edit=edit-token/u;
const RAW_URL_FIELD_PATTERN = /rawUrl/u;
const TASK_CONTENT = [
	"---",
	"id: SMOKE-001",
	"title: Smoke task",
	"state: ready",
	"owner: null",
	"updated_by: agent-context-a",
	"evidence: []",
	"---",
	"",
	"# Smoke task",
	"",
].join("\n");

test("hosted client covers product routes and HA2HA bridge", async (t) => {
	const server = createMdsyncMockServer();
	const { baseUrl } = await server.start();
	t.after(async () => {
		await server.close();
	});

	const setup = createMdsyncClient({
		actor: "agent-context-a",
		apiOrigin: baseUrl,
	});
	const created = await setup.createWorkspace({
		files: [
			{ content: "# Status\n", path: "STATUS.md" },
			{ content: TASK_CONTENT, path: "tasks/SMOKE-001.md" },
		],
		title: "MDSync client test",
	});
	assert.equal(created.ok, true, JSON.stringify(created, null, 2));
	if (!created.ok) {
		return;
	}
	const editToken = new URL(created.data.editUrl ?? "").searchParams.get(
		"edit"
	);
	const readToken = new URL(created.data.rawUrl).searchParams.get("k");
	assert.ok(editToken);
	assert.ok(readToken);
	if (!(editToken && readToken)) {
		return;
	}

	const readClient = createMdsyncClient({
		apiOrigin: baseUrl,
		auth: { kind: "read-token", token: readToken },
		workspaceId: created.data.id,
	});
	const readListing = await readClient.listFiles();
	assert.equal(readListing.ok, true, JSON.stringify(readListing, null, 2));
	if (readListing.ok) {
		assert.deepEqual(readListing.data.files.map((file) => file.path).sort(), [
			"STATUS.md",
			"tasks/SMOKE-001.md",
		]);
	}
	assert.equal(readClient.createHa2haClient().ok, false);

	const client = createMdsyncClient({
		actor: "agent-context-a",
		apiOrigin: baseUrl,
		auth: { kind: "edit-token", token: editToken },
		workspaceId: created.data.id,
	});
	const editUrl = client.editUrl();
	assert.equal(editUrl.ok, true);
	if (editUrl.ok) {
		assert.match(editUrl.data, EDIT_TOKEN_QUERY_PATTERN);
	}

	const workspace = await client.getWorkspace();
	assert.equal(workspace.ok, true, JSON.stringify(workspace, null, 2));

	const status = await client.readFile("STATUS.md");
	assert.equal(status.ok, true, JSON.stringify(status, null, 2));
	if (!status.ok) {
		return;
	}
	assert.equal(status.data.version, 1);

	const write = await client.writeFile({
		baseVersion: status.data.version,
		content: "# Status\n\nUpdated.\n",
		path: "STATUS.md",
	});
	assert.equal(write.ok, true, JSON.stringify(write, null, 2));
	if (!write.ok) {
		return;
	}
	assert.equal(write.data.version, 2);

	const conflict = await client.writeFile({
		baseVersion: status.data.version,
		content: "# stale\n",
		path: "STATUS.md",
	});
	assert.equal(conflict.ok, false);
	if (!conflict.ok) {
		assert.equal(conflict.error.code, "version_conflict");
		assert.equal(conflict.error.latest?.version, 2);
	}

	const history = await client.listFileVersions("STATUS.md");
	assert.equal(history.ok, true, JSON.stringify(history, null, 2));
	if (history.ok) {
		assert.deepEqual(
			history.data.versions.map((version) => version.version),
			[1, 2]
		);
	}
	const historical = await client.readFileVersion({
		path: "STATUS.md",
		version: 1,
	});
	assert.equal(historical.ok, true, JSON.stringify(historical, null, 2));
	if (historical.ok) {
		assert.equal(historical.data.content, "# Status\n");
	}

	const comment = await client.createComment({
		body: "Anchor the original status.",
		path: "STATUS.md",
		selector: { line: 1 },
		version: 1,
	});
	assert.equal(comment.ok, true, JSON.stringify(comment, null, 2));
	if (!comment.ok) {
		return;
	}
	const comments = await client.listComments({ path: "STATUS.md" });
	assert.equal(comments.ok, true, JSON.stringify(comments, null, 2));
	if (comments.ok) {
		assert.equal(comments.data.comments.length, 1);
	}
	const resolved = await client.resolveComment({ commentId: comment.data.id });
	assert.equal(resolved.ok, true, JSON.stringify(resolved, null, 2));
	if (resolved.ok) {
		assert.equal(resolved.data.resolvedBy, "agent-context-a");
	}

	const events = await client.listEvents();
	assert.equal(events.ok, true, JSON.stringify(events, null, 2));
	if (events.ok) {
		assert.equal(events.data.events.length >= 3, true);
	}
	assert.equal((await client.getCapabilities()).ok, true);
	assert.equal((await client.rotateCapability("read")).ok, true);
	assert.equal((await client.getAdminStats()).ok, true);

	const exported = await client.exportWorkspace();
	assert.equal(exported.ok, true, JSON.stringify(exported, null, 2));
	if (!exported.ok) {
		return;
	}
	assert.equal(exported.data.format, "mdsync.workspace-export.v1");
	const imported = await client.importWorkspace(exported.data);
	assert.equal(imported.ok, true, JSON.stringify(imported, null, 2));
	if (imported.ok) {
		assert.equal(imported.data.importedCounts?.comments, 1);
	}
	assert.equal((await client.getRetention()).ok, true);
	const prune = await client.pruneRetention({
		before: "2026-07-09T00:00:00.000Z",
	});
	assert.equal(prune.ok, true, JSON.stringify(prune, null, 2));

	const ha2ha = client.createHa2haClient();
	assert.equal(ha2ha.ok, true, JSON.stringify(ha2ha, null, 2));
	if (!ha2ha.ok) {
		return;
	}
	const claim = await ha2ha.data.claimTask({ taskId: "SMOKE-001" });
	assert.equal(claim.ok, true, JSON.stringify(claim, null, 2));
	const evidence = await ha2ha.data.addEvidence({
		body: "MDSync client test passed.",
		kind: "client-test",
		result: "pass",
		taskId: "SMOKE-001",
	});
	assert.equal(evidence.ok, true, JSON.stringify(evidence, null, 2));

	assert.equal(
		(await client.deleteFile({ baseVersion: 2, path: "STATUS.md" })).ok,
		true
	);
	assert.equal((await client.revokeCapability("edit")).ok, true);
});

test("hosted client returns validation_error for malformed success payloads", async () => {
	const client = createMdsyncClient({
		apiOrigin: "https://api.test",
		fetch: async () =>
			new Response(JSON.stringify({ id: "workspace-1" }), {
				headers: { "Content-Type": "application/json" },
				status: 200,
			}),
	});

	const created = await client.createWorkspace({
		files: [{ content: "# Status\n", path: "STATUS.md" }],
	});

	assert.equal(created.ok, false);
	if (!created.ok) {
		assert.equal(created.error.code, "validation_error");
		assert.match(created.error.message, RAW_URL_FIELD_PATTERN);
	}
});

test("read token clients reject edit operations before issuing requests", async () => {
	let called = false;
	const client = createMdsyncClient({
		apiOrigin: "http://mdsync.test",
		auth: { kind: "read-token", token: "read-token" },
		fetch: (() => {
			called = true;
			return Promise.resolve(new Response("{}"));
		}) as typeof fetch,
		workspaceId: "workspace-read-only",
	});

	const stats = await client.getAdminStats();
	assert.equal(stats.ok, false);
	if (!stats.ok) {
		assert.equal(stats.error.code, "missing_token");
	}
	assert.equal(client.createHa2haClient().ok, false);
	assert.equal(called, false);
});
