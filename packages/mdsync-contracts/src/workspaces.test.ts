import assert from "node:assert/strict";
import { test } from "node:test";

import {
	createdWorkspaceResponseSchema,
	createWorkspaceRequestSchema,
	WORKSPACE_EXPORT_FORMAT,
	WORKSPACE_EXPORT_SCHEMA_VERSION,
	workspaceExportBundleSchema,
	workspaceFileResponseSchema,
	workspaceVersionConflictResponseSchema,
} from "./workspaces";

test("workspace create requests preserve default access policy", () => {
	const parsed = createWorkspaceRequestSchema.parse({
		files: [{ content: "# Status\n", path: "STATUS.md" }],
		title: "Demo",
	});

	assert.equal(parsed.readAccess, "token");
	assert.equal(parsed.writeAccess, "token");
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
