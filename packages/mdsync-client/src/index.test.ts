import assert from "node:assert/strict";
import { test } from "node:test";

import { createMdsyncMockServer } from "../../../scripts/lib/mdsync-mock-server.mjs";
import {
	createMdsyncClient,
	createMdsyncClientFromUrl,
	parseMdsyncWorkspaceUrl,
	validateMdsyncHa2haManifest,
} from "./index";

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

test("workspace URL parsing accepts product routes and rejects unsafe capabilities", () => {
	for (const [url, route, filePath] of [
		["https://app.example.com/w/workspace-1?k=read", "overview", null],
		["https://app.example.com/w/workspace-1/work?edit=write", "work", null],
		[
			"https://app.example.com/w/workspace-1/files/tasks%2FTASK-001.md?edit=write",
			"files",
			"tasks/TASK-001.md",
		],
		[
			"https://api.example.com/w/workspace-1/raw/STATUS.md?k=read",
			"raw",
			"STATUS.md",
		],
		["https://app.example.com/w/workspace-1/activity", "activity", null],
		["https://app.example.com/w/workspace-1/settings", "settings", null],
	] as const) {
		const parsed = parseMdsyncWorkspaceUrl(url);
		assert.equal(parsed.ok, true, JSON.stringify(parsed, null, 2));
		if (parsed.ok) {
			assert.equal(parsed.data.route, route);
			assert.equal(parsed.data.filePath, filePath);
		}
	}

	for (const url of [
		"http://app.example.com/w/workspace-1?edit=secret",
		"https://user:password@app.example.com/w/workspace-1",
		"https://app.example.com/w/workspace-1?edit=secret&k=read-secret",
		"https://app.example.com/w/workspace-1?edit=one&edit=two",
		"https://app.example.com/not-a-workspace?edit=secret",
	]) {
		const parsed = parseMdsyncWorkspaceUrl(url);
		assert.equal(parsed.ok, false);
		if (!parsed.ok) {
			assert.equal(parsed.error.message.includes("secret"), false);
			assert.equal(parsed.error.message.includes("password"), false);
		}
	}
});

test("URL bootstrap connects viewer and collaborator agents through discovery", async (t) => {
	const server = createMdsyncMockServer();
	const { baseUrl } = await server.start();
	t.after(async () => {
		await server.close();
	});
	const setup = createMdsyncClient({ apiOrigin: baseUrl });
	const created = await setup.createHa2haWorkspace({
		actor: "agent-a",
		files: [{ content: TASK_CONTENT, path: "tasks/SMOKE-001.md" }],
		title: "URL handoff",
	});
	assert.equal(created.ok, true, JSON.stringify(created, null, 2));
	if (!(created.ok && created.data.editUrl)) {
		return;
	}

	const viewer = await createMdsyncClientFromUrl({
		actor: "reviewer",
		url: created.data.workspaceUrl,
	});
	assert.equal(viewer.ok, true, JSON.stringify(viewer, null, 2));
	if (viewer.ok) {
		assert.equal(viewer.data.access, "read");
		assert.equal((await viewer.data.client.getOverview()).ok, true);
		assert.equal(viewer.data.client.createHa2haClient().ok, false);
	}

	const collaborator = await createMdsyncClientFromUrl({
		actor: "agent-b",
		url: created.data.editUrl,
	});
	assert.equal(collaborator.ok, true, JSON.stringify(collaborator, null, 2));
	if (!collaborator.ok) {
		return;
	}
	assert.equal(collaborator.data.access, "edit");
	const manifest = await collaborator.data.client.readFile(
		".ha2ha/workspace.json"
	);
	assert.equal(manifest.ok, true, JSON.stringify(manifest, null, 2));
	if (manifest.ok) {
		const validated = validateMdsyncHa2haManifest({
			content: manifest.data.content,
			workspaceId: collaborator.data.workspaceId,
		});
		assert.equal(validated.ok, true, JSON.stringify(validated, null, 2));
		assert.equal(
			validateMdsyncHa2haManifest({
				content: manifest.data.content,
				workspaceId: "another-workspace",
			}).ok,
			false
		);
	}
	const ha2ha = collaborator.data.client.createHa2haClient();
	assert.equal(ha2ha.ok, true, JSON.stringify(ha2ha, null, 2));
	if (!ha2ha.ok) {
		return;
	}
	assert.equal((await ha2ha.data.claimTask({ taskId: "SMOKE-001" })).ok, true);
	assert.equal(
		(
			await ha2ha.data.addEvidence({
				body: "Agent B joined from the collaborator URL.",
				kind: "url-handoff",
				result: "pass",
				taskId: "SMOKE-001",
			})
		).ok,
		true
	);
});

test("URL bootstrap validates discovery origin and link builders split web and API origins", async () => {
	const client = createMdsyncClient({
		apiOrigin: "https://api.example.com/",
		auth: { kind: "edit-token", token: "edit-token" },
		webOrigin: "https://app.example.com/",
		workspaceId: "workspace-1",
	});
	const workspaceUrl = client.workspaceUrl();
	const rawUrl = client.rawUrl();
	assert.equal(
		workspaceUrl.ok && new URL(workspaceUrl.data).origin,
		"https://app.example.com"
	);
	assert.equal(
		rawUrl.ok && new URL(rawUrl.data).origin,
		"https://api.example.com"
	);

	const joined = await createMdsyncClientFromUrl({
		actor: "agent-a",
		fetch: async () =>
			Response.json({
				apiOrigin: "https://api.example.com",
				discoveryVersion: 1,
				product: "mdsync",
				webOrigin: "https://different.example.com",
			}),
		url: "https://app.example.com/w/workspace-1?edit=do-not-leak",
	});
	assert.equal(joined.ok, false);
	if (!joined.ok) {
		assert.equal(joined.error.code, "validation_error");
		assert.equal(joined.error.message.includes("do-not-leak"), false);
	}
});

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
	const overview = await readClient.getOverview();
	assert.equal(overview.ok, true, JSON.stringify(overview, null, 2));
	if (overview.ok) {
		assert.equal(overview.data.tasks.items[0]?.id, "SMOKE-001");
		assert.equal(overview.data.workspaceId, created.data.id);
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
	const activity = await client.listActivity();
	assert.equal(activity.ok, true, JSON.stringify(activity, null, 2));
	if (activity.ok) {
		assert.equal(
			activity.data.items.some((item) => item.type === "comment.created"),
			true
		);
		assert.equal(
			activity.data.items.some((item) => item.type === "comment.resolved"),
			true
		);
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

test("listActivity rejects malformed product activity payloads", async () => {
	const client = createMdsyncClient({
		apiOrigin: "https://api.test",
		fetch: async () =>
			Response.json({
				items: [
					{
						actor: null,
						body: "must not be accepted",
						createdAt: "2026-07-14T10:00:00.000Z",
						id: "comment:1:created",
						path: "README.md",
						source: "comment",
						type: "comment.created",
						version: 1,
					},
				],
				workspaceId: "workspace-1",
			}),
		workspaceId: "workspace-1",
	});

	const activity = await client.listActivity();
	assert.equal(activity.ok, false);
	if (!activity.ok) {
		assert.equal(activity.error.code, "validation_error");
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

test("manifest validation requires exact MDSync HA2HA policy and version", () => {
	const manifest = {
		capabilities: ["raw-read", "file-write"],
		conflictPolicy: "baseVersion-required",
		paths: {
			decisions: "decisions/",
			evidence: "evidence/",
			logs: "logs/",
			manifestMarkdown: "HA2HA.md",
			participants: "participants/",
			status: "STATUS.md",
			tasks: "tasks/",
			workspaceManifest: ".ha2ha/workspace.json",
		},
		protocol: "ha2ha",
		protocolVersion: "1.0.0",
		routes: {
			rawFile: "/w/workspace-1/raw/{path}",
			rawListing: "/w/workspace-1/raw",
		},
		title: "Manifest test",
		workspaceId: "workspace-1",
	};

	assert.equal(
		validateMdsyncHa2haManifest({
			content: JSON.stringify(manifest),
			workspaceId: "workspace-1",
		}).ok,
		true
	);
	for (const invalidManifest of [
		{ ...manifest, conflictPolicy: "last-write-wins" },
		{ ...manifest, protocolVersion: "2.0.0" },
		{ ...manifest, workspaceId: "workspace-2" },
	]) {
		const result = validateMdsyncHa2haManifest({
			content: JSON.stringify(invalidManifest),
			workspaceId: "workspace-1",
		});
		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.equal(result.error.code, "validation_error");
		}
	}
	assert.equal(
		validateMdsyncHa2haManifest({
			content: "not-json",
			workspaceId: "workspace-1",
		}).ok,
		false
	);
});
