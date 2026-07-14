import assert from "node:assert/strict";
import { test } from "node:test";

import {
	createdWorkspaceResponseSchema,
	createWorkspaceRequestSchema,
	mdsyncDiscoveryResponseSchema,
	WORKSPACE_EXPORT_FORMAT,
	WORKSPACE_EXPORT_SCHEMA_VERSION,
	workspaceActivityResponseSchema,
	workspaceExportBundleSchema,
	workspaceFileResponseSchema,
	workspaceOverviewResponseSchema,
	workspaceVersionConflictResponseSchema,
} from "./workspaces";

test("workspace activity is strict and excludes comment content", () => {
	const payload = {
		items: [
			{
				actor: "reviewer",
				createdAt: "2026-07-14T10:00:00.000Z",
				id: "comment:comment-1:created",
				path: "README.md",
				source: "comment",
				type: "comment.created",
				version: 1,
			},
		],
		workspaceId: "workspace-1",
	};

	assert.equal(
		workspaceActivityResponseSchema.safeParse(payload).success,
		true
	);
	assert.equal(
		workspaceActivityResponseSchema.safeParse({
			...payload,
			items: [{ ...payload.items[0], body: "must stay private" }],
		}).success,
		false
	);
});

test("workspace create requests preserve default access policy", () => {
	const parsed = createWorkspaceRequestSchema.parse({
		files: [{ content: "# Status\n", path: "STATUS.md" }],
		title: "Demo",
	});

	assert.equal(parsed.readAccess, "token");
	assert.equal(parsed.writeAccess, "token");
});

test("HA2HA workspace create requests require an actor, writable access, and a task", () => {
	const valid = createWorkspaceRequestSchema.safeParse({
		actor: "agent-a",
		files: [
			{
				content: "---\nid: TASK-001\ntitle: Start\nstate: ready\n---\n",
				path: "tasks/TASK-001.md",
			},
		],
		protocol: { kind: "ha2ha", version: "1.0.0" },
	});
	assert.equal(valid.success, true, JSON.stringify(valid, null, 2));

	for (const input of [
		{
			files: [{ content: "# Task\n", path: "tasks/TASK-001.md" }],
			protocol: { kind: "ha2ha", version: "1.0.0" },
		},
		{
			actor: "agent-a",
			files: [{ content: "# Task\n", path: "tasks/TASK-001.md" }],
			protocol: { kind: "ha2ha", version: "1.0.0" },
			writeAccess: "none",
		},
		{
			actor: "agent-a",
			files: [{ content: "# Status\n", path: "STATUS.md" }],
			protocol: { kind: "ha2ha", version: "1.0.0" },
		},
	]) {
		assert.equal(createWorkspaceRequestSchema.safeParse(input).success, false);
	}
});

test("MDSync discovery responses expose origins only", () => {
	assert.equal(
		mdsyncDiscoveryResponseSchema.safeParse({
			apiOrigin: "https://api.example.com",
			discoveryVersion: 1,
			product: "mdsync",
			webOrigin: "https://app.example.com",
		}).success,
		true
	);
	assert.equal(
		mdsyncDiscoveryResponseSchema.safeParse({
			apiOrigin: "https://api.example.com/path",
			discoveryVersion: 1,
			product: "mdsync",
			webOrigin: "https://app.example.com",
		}).success,
		false
	);
	assert.equal(
		mdsyncDiscoveryResponseSchema.safeParse({
			apiOrigin: "https://api.example.com",
			discoveryVersion: 1,
			product: "mdsync",
			token: "secret",
			webOrigin: "https://app.example.com",
		}).success,
		false
	);
});

test("workspace file responses reject silently defaultable malformed payloads", () => {
	assert.equal(
		workspaceFileResponseSchema.safeParse({
			content: "# Status\n",
			contentType: "text/markdown; charset=utf-8",
			path: "STATUS.md",
			updatedAt: "2026-07-08T00:00:00.000Z",
			updatedBy: null,
			version: 1,
			workspaceId: "workspace-1",
		}).success,
		true
	);

	assert.equal(
		workspaceFileResponseSchema.safeParse({
			content: "# Status\n",
			path: "STATUS.md",
			version: 1,
			workspaceId: "workspace-1",
		}).success,
		false
	);
});

test("workspace export bundle validates the product wire format", () => {
	const result = workspaceExportBundleSchema.safeParse({
		adminEvents: [],
		comments: [],
		events: [],
		exportedAt: "2026-07-08T00:00:00.000Z",
		files: [
			{
				content: "# Status\n",
				contentType: "text/markdown; charset=utf-8",
				createdAt: "2026-07-08T00:00:00.000Z",
				path: "STATUS.md",
				updatedAt: "2026-07-08T00:00:00.000Z",
				updatedBy: "agent",
				version: 1,
			},
		],
		fileVersions: [],
		format: WORKSPACE_EXPORT_FORMAT,
		schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
		workspace: {
			createdAt: "2026-07-08T00:00:00.000Z",
			id: "workspace-1",
			readAccess: "token",
			title: null,
			totalSizeBytes: 9,
			updatedAt: "2026-07-08T00:00:00.000Z",
			writeAccess: "token",
		},
	});

	assert.equal(result.success, true, JSON.stringify(result, null, 2));
});

test("conflict responses require a structured latest file or null", () => {
	assert.equal(
		workspaceVersionConflictResponseSchema.safeParse({
			error: "version_conflict",
			latest: null,
			message: "File already changed.",
		}).success,
		true
	);
	assert.equal(
		workspaceVersionConflictResponseSchema.safeParse({
			error: "version_conflict",
			latest: {},
			message: "File already changed.",
		}).success,
		false
	);
});

test("created workspace responses require stable link fields", () => {
	assert.equal(
		createdWorkspaceResponseSchema.safeParse({
			id: "workspace-1",
			rawUrl: "https://api.test/w/workspace-1/raw",
			workspaceUrl: "https://web.test/w/workspace-1",
		}).success,
		true
	);
	assert.equal(
		createdWorkspaceResponseSchema.safeParse({
			id: "workspace-1",
			workspaceUrl: "https://web.test/w/workspace-1",
		}).success,
		false
	);
});

test("workspace overview is strict, read-safe, and preserves canonical task states", () => {
	const payload = {
		activity: {
			recent: [
				{
					actor: "agent-a",
					createdAt: "2026-07-14T10:00:00.000Z",
					path: "tasks/START-001.md",
					type: "file.created",
					version: 1,
				},
			],
		},
		comments: { staleAnchors: 0, total: 0, unresolved: 0 },
		files: { latestUpdatedAt: "2026-07-14T10:00:00.000Z", total: 1 },
		generatedAt: "2026-07-14T10:00:00.000Z",
		tasks: {
			byState: [
				{ count: 1, name: "ready" },
				{ count: 0, name: "claimed" },
				{ count: 0, name: "working" },
				{ count: 0, name: "blocked" },
				{ count: 0, name: "review" },
				{ count: 0, name: "done" },
				{ count: 0, name: "abandoned" },
			],
			invalidCount: 0,
			items: [
				{
					id: "START-001",
					owner: null,
					path: "tasks/START-001.md",
					priority: null,
					state: "ready",
					title: "Start",
					updatedBy: "agent-a",
					valid: true,
					version: 1,
				},
			],
			total: 1,
		},
		workspaceId: "workspace-1",
	};

	assert.equal(
		workspaceOverviewResponseSchema.safeParse(payload).success,
		true
	);
	assert.equal(
		workspaceOverviewResponseSchema.safeParse({
			...payload,
			storage: { r2Prefix: "private/workspace-1" },
		}).success,
		false
	);
});
