import { expect, type Page, test } from "@playwright/test";

interface WorkspaceFileState {
	adminEvents: WorkspaceAdminEventState[];
	adminStatsError: boolean;
	capabilities: WorkspaceCapabilitiesState;
	comments: WorkspaceCommentState[];
	content: string;
	contentType: string;
	events: WorkspaceEventState[];
	extraFiles: WorkspaceCurrentFileState[];
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
	versions: WorkspaceVersionState[];
	workspaceId: string;
}

interface WorkspaceCapabilitiesState {
	editTokenActive: boolean;
	readTokenActive: boolean;
	writeAccess: "none" | "public" | "token";
}

interface WorkspaceCurrentFileState {
	content: string;
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
}

interface WorkspaceAdminEventState {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
}

interface WorkspaceCommentState {
	anchor: {
		line?: number;
	};
	authorId: string | null;
	body: string;
	createdAt: string;
	id: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt: string;
	version: number;
	workspaceId: string;
}

interface WorkspaceEventState {
	actor: string | null;
	createdAt: string;
	id: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	version: number | null;
	workspaceId: string;
}

interface WorkspaceVersionState {
	content: string;
	contentType: string;
	createdAt: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

const API_ORIGIN = "http://localhost:3000";
const WEB_ORIGIN = "http://localhost:5173";
const WORKSPACE_ID = "ws-e2e";
const EDIT_TOKEN = "edit-token";
const NEXT_EDIT_TOKEN = "next-edit-token";
const NEXT_READ_TOKEN = "next-read-token";
const READ_TOKEN = "read-token";
const README_BUTTON_NAME_PATTERN = /README.md/;
const EVIDENCE_BUTTON_NAME_PATTERN = /evidence\/TEAM-001\/typecheck.md/;
const RESOLVE_SUFFIX_PATTERN = /\/resolve$/;
const TASK_STATE_PATTERN = /^state:\s*(.+?)\s*$/m;
const VERSION_ONE_BUTTON_NAME_PATTERN = /Version 1/;

test("web app creates, loads, links, and saves a workspace file", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	let saveRequest: Record<string, unknown> | null = null;
	await mockWorkspaceApi(page, state, {
		onSave: (body) => {
			saveRequest = body;
		},
	});

	await page.goto(WEB_ORIGIN);
	await page.getByLabel("Title").fill("E2E workspace");
	await page.getByLabel("Path").fill("README.md");
	await page.getByLabel("Markdown").fill("# E2E workspace\n");
	await page.getByRole("button", { name: "Create" }).click();

	await expect(page).toHaveURL(
		`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`
	);
	await expect(
		page.getByRole("heading", { name: "E2E workspace" })
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: README_BUTTON_NAME_PATTERN })
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Raw" })).toHaveAttribute(
		"href",
		`${API_ORIGIN}/w/${WORKSPACE_ID}/raw/README.md?edit=${EDIT_TOKEN}`
	);

	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByText("v2")).toBeVisible();
	expect(saveRequest).toMatchObject({
		actor: "web",
		baseVersion: 1,
		contentType: "text/markdown; charset=utf-8",
		path: "README.md",
	});
	expect(consoleErrors).toEqual([]);
});

test("web app loads read-token workspaces without edit controls", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	await mockWorkspaceApi(page, state);

	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${READ_TOKEN}`);

	await expect(page.getByRole("heading", { name: "README.md" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Demo" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
	expect(consoleErrors).toEqual([]);
});

test("web app loads latest file content after a stale save conflict", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	const saveRequests: Record<string, unknown>[] = [];
	await mockWorkspaceApi(page, state, {
		conflictOnFirstSave: true,
		onSave: (body) => {
			saveRequests.push(body);
		},
	});

	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await page.getByRole("button", { name: "Save" }).click();

	await expect(
		page.getByText("File changed elsewhere. Latest content loaded.")
	).toBeVisible();
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByText("v3")).toBeVisible();
	expect(saveRequests).toHaveLength(2);
	expect(saveRequests[1]).toMatchObject({
		baseVersion: 2,
		content: "# Latest\n\nRemote content.\n",
		path: "README.md",
	});
	expect(
		consoleErrors.filter((message) => !message.includes("409 (Conflict)"))
	).toEqual([]);
});

test("web app filters activity and restores historical file versions", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	applyFileChange(state, {
		actor: "agent-context-b",
		content: "# Current\n\nRemote content.\n",
		updatedAt: "2026-07-08T00:02:00.000Z",
	});
	const restoreRequests: Record<string, unknown>[] = [];
	await mockWorkspaceApi(page, state, {
		onSave: (body) => {
			restoreRequests.push(body);
		},
	});

	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await page.getByRole("button", { name: "Activity" }).click();
	await page.getByLabel("Path").fill("README");
	await page.getByLabel("Actor").fill("agent-context-b");
	await page.getByLabel("Event").selectOption("file.updated");
	await page.getByLabel("Time").selectOption("week");

	const filteredActivityRow = page.locator(".activity-event").filter({
		hasText: "file.updated",
	});
	await expect(filteredActivityRow.getByText("agent-context-b")).toBeVisible();
	await expect(filteredActivityRow.getByText("file.updated")).toBeVisible();
	await expect(page.getByText("workspace-create")).toHaveCount(0);

	await page.getByRole("button", { name: "History" }).click();
	await page
		.getByRole("button", { name: VERSION_ONE_BUTTON_NAME_PATTERN })
		.click();
	await expect(
		page.locator(".history-preview").getByText("# Demo")
	).toBeVisible();
	await page.getByRole("button", { name: "Restore version" }).click();

	await expect(page.getByText("v3")).toBeVisible();
	expect(restoreRequests.at(-1)).toMatchObject({
		actor: "web",
		baseVersion: 2,
		content: "# Demo\n\nInitial content.\n",
		path: "README.md",
	});
	expect(consoleErrors).toEqual([]);
});

test("web app creates lists resolves and preserves version-anchored comments", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	const commentRequests: Record<string, unknown>[] = [];
	await mockWorkspaceApi(page, state, {
		onComment: (body) => {
			commentRequests.push(body);
		},
	});

	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await page.getByRole("button", { name: "Comments" }).click();
	await page.getByLabel("Line").fill("1");
	await page
		.getByRole("textbox", { name: "Comment" })
		.fill("Clarify this opening before handoff.");
	await page.getByRole("button", { name: "Add comment" }).click();

	await expect(
		page.getByText("Clarify this opening before handoff.")
	).toBeVisible();
	await expect(page.getByText("Anchored to v1")).toBeVisible();
	await expect(page.getByText("Line 1")).toBeVisible();
	expect(commentRequests[0]).toMatchObject({
		actor: "web",
		body: "Clarify this opening before handoff.",
		path: "README.md",
		selector: { line: 1 },
		version: 1,
	});

	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await page.getByRole("button", { name: "Comments" }).click();

	await expect(page.getByText("Anchored to v1")).toBeVisible();
	await expect(page.getByText("Current v2")).toBeVisible();
	await expect(
		page.getByText("The file changed after this comment was anchored.")
	).toBeVisible();

	await page.getByRole("button", { name: "Resolve" }).click();
	await expect(page.getByText("Resolved by web.")).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

test("web app shows admin stats empty states and admin load errors", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	applyFileChange(state, {
		actor: "agent-context-a",
		content: "# Demo\n\nUpdated content.\n",
		updatedAt: "2026-07-08T00:01:00.000Z",
	});
	state.comments.push({
		anchor: { line: 1 },
		authorId: "reviewer",
		body: "Review the old opening.",
		createdAt: "2026-07-08T00:02:00.000Z",
		id: "comment-admin",
		path: state.path,
		resolvedAt: null,
		resolvedBy: null,
		updatedAt: "2026-07-08T00:02:00.000Z",
		version: 1,
		workspaceId: WORKSPACE_ID,
	});
	state.adminEvents.push({
		actor: "agent-context-b",
		createdAt: "2026-07-08T00:03:00.000Z",
		path: state.path,
		payload: {
			baseVersion: 1,
			latestVersion: state.version,
			operation: "update",
		},
		type: "file.version_conflict",
	});
	await mockWorkspaceApi(page, state);

	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await page.getByRole("button", { name: "Admin" }).click();

	await expect(
		page.getByRole("heading", { name: "Workspace health" })
	).toBeVisible();
	await expect(page.getByText("Attention")).toBeVisible();
	await expect(page.getByText("Version conflicts were observed")).toBeVisible();
	await expect(
		page.getByText("Unresolved comments are anchored")
	).toBeVisible();
	await expect(page.getByText("file.version_conflict")).toBeVisible();
	await expect(page.getByText("latest v2")).toBeVisible();
	await expect(page.getByText("No task files are present.")).toBeVisible();
	await expect(page.getByText("No cleanup failures recorded.")).toBeVisible();
	await expect(page.getByText("Not run")).toBeVisible();
	await expect(
		page.getByRole("button", { exact: true, name: "Export JSON" })
	).toBeVisible();
	await expect(page.getByText("Import JSON")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Load retention" })
	).toBeVisible();

	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { exact: true, name: "Export JSON" }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe(
		`${WORKSPACE_ID}-workspace-export.json`
	);
	await expect(page.getByText("Workspace export downloaded.")).toBeVisible();

	await page.getByRole("button", { name: "Load retention" }).click();
	await expect(page.getByText("Retention policy loaded.")).toBeVisible();
	await expect(page.getByText("6 areas")).toBeVisible();
	await expect(page.getByText("deferred")).toBeVisible();

	await page.getByLabel("Import workspace export JSON").setInputFiles({
		buffer: Buffer.from(JSON.stringify(workspaceExportPayload(state))),
		mimeType: "application/json",
		name: "workspace-export.json",
	});
	await expect(
		page.getByText("Workspace import created with 1 files.")
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Open imported workspace" })
	).toHaveAttribute(
		"href",
		`${WEB_ORIGIN}/w/imported-workspace?edit=${NEXT_EDIT_TOKEN}`
	);
	await expect(page.getByText("Read link")).toBeVisible();
	await expect(page.getByText("Edit link")).toBeVisible();

	await page.getByRole("button", { name: "Rotate" }).first().click();
	await expect(page.getByText("Read link rotated.")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Open new read link" })
	).toHaveAttribute(
		"href",
		`${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${NEXT_READ_TOKEN}`
	);

	await page.getByRole("button", { name: "Rotate" }).nth(1).click();
	await expect(
		page.getByText("Edit link rotated and this session was updated.")
	).toBeVisible();
	await expect(page).toHaveURL(
		`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${NEXT_EDIT_TOKEN}`
	);

	await page.getByRole("button", { name: "Revoke" }).first().click();
	await expect(page.getByText("Read link revoked.")).toBeVisible();
	await expect(page.getByText("No active token · token")).toBeVisible();

	state.adminStatsError = true;
	await page
		.locator(".document-toolbar")
		.getByRole("button", { name: "Refresh" })
		.click();

	await expect(page.getByText("Admin stats unavailable.")).toBeVisible();
	expect(
		consoleErrors.filter(
			(message) => !message.includes("500 (Internal Server Error)")
		)
	).toEqual([]);
});

test("web app exposes a limited team workspace pilot across agents and human review", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	const state = createWorkspaceState();
	state.path = "STATUS.md";
	state.content = "# Team pilot\n\nagent-context-a handed off to reviewer.\n";
	state.version = 2;
	state.updatedAt = "2026-07-08T00:04:00.000Z";
	state.updatedBy = "agent-context-a";
	state.versions = [
		{
			content: "# Team pilot\n\nInitial state.\n",
			contentType: state.contentType,
			createdAt: "2026-07-08T00:00:00.000Z",
			path: "STATUS.md",
			sha256: "sha-status-1",
			sizeBytes: 29,
			updatedBy: "human-reviewer",
			version: 1,
			workspaceId: WORKSPACE_ID,
		},
		{
			content: state.content,
			contentType: state.contentType,
			createdAt: state.updatedAt,
			path: "STATUS.md",
			sha256: "sha-status-2",
			sizeBytes: state.content.length,
			updatedBy: "agent-context-a",
			version: 2,
			workspaceId: WORKSPACE_ID,
		},
	];
	state.events = [
		{
			actor: "human-reviewer",
			createdAt: "2026-07-08T00:00:00.000Z",
			id: "event-status-created",
			path: "STATUS.md",
			payload: { sizeBytes: 29 },
			type: "file.created",
			version: 1,
			workspaceId: WORKSPACE_ID,
		},
		{
			actor: "agent-context-a",
			createdAt: "2026-07-08T00:04:00.000Z",
			id: "event-status-updated",
			path: "STATUS.md",
			payload: { baseVersion: 1 },
			type: "file.updated",
			version: 2,
			workspaceId: WORKSPACE_ID,
		},
		{
			actor: "agent-context-b",
			createdAt: "2026-07-08T00:05:00.000Z",
			id: "event-task-updated",
			path: "tasks/TEAM-001.md",
			payload: { baseVersion: 1 },
			type: "file.updated",
			version: 2,
			workspaceId: WORKSPACE_ID,
		},
		{
			actor: "agent-context-b",
			createdAt: "2026-07-08T00:06:00.000Z",
			id: "event-evidence-created",
			path: "evidence/TEAM-001/typecheck.md",
			payload: { sizeBytes: 126 },
			type: "file.created",
			version: 1,
			workspaceId: WORKSPACE_ID,
		},
	];
	state.extraFiles = [
		{
			content: [
				"---",
				"id: TEAM-001",
				"title: Validate handoff",
				"state: claimed",
				"owner: agent-context-b",
				"updated_by: agent-context-b",
				"---",
				"",
				"## Evidence",
				"",
				"- evidence/TEAM-001/typecheck.md",
				"",
			].join("\n"),
			contentType: state.contentType,
			path: "tasks/TEAM-001.md",
			updatedAt: "2026-07-08T00:05:00.000Z",
			updatedBy: "agent-context-b",
			version: 2,
		},
		{
			content: [
				"---",
				"task: TEAM-001",
				"kind: command",
				"result: pass",
				"actor: agent-context-b",
				"---",
				"",
				"Typecheck passed for the pilot handoff.",
				"",
			].join("\n"),
			contentType: state.contentType,
			path: "evidence/TEAM-001/typecheck.md",
			updatedAt: "2026-07-08T00:06:00.000Z",
			updatedBy: "agent-context-b",
			version: 1,
		},
	];
	state.comments.push({
		anchor: { line: 3 },
		authorId: "human-reviewer",
		body: "Human review is visible on the shared handoff.",
		createdAt: "2026-07-08T00:07:00.000Z",
		id: "comment-team-pilot",
		path: "STATUS.md",
		resolvedAt: null,
		resolvedBy: null,
		updatedAt: "2026-07-08T00:07:00.000Z",
		version: 2,
		workspaceId: WORKSPACE_ID,
	});
	await mockWorkspaceApi(page, state);

	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await expect(
		page.getByRole("heading", { name: "E2E workspace" })
	).toBeVisible();
	await expect(page.getByText("agent-context-a handed off")).toBeVisible();

	await page.getByRole("button", { name: "Activity" }).click();
	await expect(
		page.locator(".activity-event").filter({ hasText: "agent-context-a" })
	).toBeVisible();
	await expect(
		page
			.locator(".activity-event")
			.filter({ hasText: "agent-context-b" })
			.first()
	).toBeVisible();
	await expect(
		page.locator(".activity-event").filter({ hasText: "tasks/TEAM-001.md" })
	).toBeVisible();

	await page.getByRole("button", { name: "History" }).click();
	await expect(
		page.getByRole("button", { name: VERSION_ONE_BUTTON_NAME_PATTERN })
	).toBeVisible();
	await page
		.getByRole("button", { name: VERSION_ONE_BUTTON_NAME_PATTERN })
		.click();
	await expect(page.locator(".history-preview")).toContainText(
		"Initial state."
	);

	await page.getByRole("button", { name: "Comments" }).click();
	await expect(
		page.getByText("Human review is visible on the shared handoff.")
	).toBeVisible();

	await page.getByRole("button", { name: "Admin" }).click();
	await expect(
		page.locator(".admin-record-list").getByText("tasks/TEAM-001.md")
	).toBeVisible();
	await expect(page.getByText("claimed")).toBeVisible();
	await expect(page.getByText("Read link")).toBeVisible();
	await expect(page.getByText("Edit link")).toBeVisible();

	await page.getByRole("button", { name: "Activity" }).click();
	await page
		.locator(".activity-event")
		.filter({ hasText: "evidence/TEAM-001/typecheck.md" })
		.getByRole("button", { name: EVIDENCE_BUTTON_NAME_PATTERN })
		.click();
	await expect(
		page.getByText("Typecheck passed for the pilot handoff.")
	).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

function createWorkspaceState(): WorkspaceFileState {
	return {
		adminEvents: [],
		adminStatsError: false,
		capabilities: {
			editTokenActive: true,
			readTokenActive: true,
			writeAccess: "token",
		},
		comments: [],
		content: "# Demo\n\nInitial content.\n",
		contentType: "text/markdown; charset=utf-8",
		events: [
			{
				actor: "workspace-create",
				createdAt: "2026-07-08T00:00:00.000Z",
				id: "event-1",
				path: "README.md",
				payload: { sizeBytes: 25 },
				type: "file.created",
				version: 1,
				workspaceId: WORKSPACE_ID,
			},
		],
		extraFiles: [],
		path: "README.md",
		updatedAt: "2026-07-08T00:00:00.000Z",
		updatedBy: "workspace-create",
		version: 1,
		versions: [
			{
				content: "# Demo\n\nInitial content.\n",
				contentType: "text/markdown; charset=utf-8",
				createdAt: "2026-07-08T00:00:00.000Z",
				path: "README.md",
				sha256: "sha-1",
				sizeBytes: 25,
				updatedBy: "workspace-create",
				version: 1,
				workspaceId: WORKSPACE_ID,
			},
		],
		workspaceId: WORKSPACE_ID,
	};
}

async function mockWorkspaceApi(
	page: Page,
	state: WorkspaceFileState,
	options: {
		conflictOnFirstSave?: boolean;
		onComment?: (body: Record<string, unknown>) => void;
		onSave?: (body: Record<string, unknown>) => void;
	} = {}
) {
	let hasConflicted = false;
	await page.route(`${API_ORIGIN}/**`, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const method = request.method();

		if (method === "POST" && url.pathname === "/api/workspaces") {
			await route.fulfill({
				contentType: "application/json",
				json: {
					editUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`,
					id: WORKSPACE_ID,
					rawUrl: `${API_ORIGIN}/w/${WORKSPACE_ID}/raw?k=${READ_TOKEN}`,
					workspaceUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${READ_TOKEN}`,
				},
				status: 201,
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: {
					createdAt: "2026-07-08T00:00:00.000Z",
					id: WORKSPACE_ID,
					readAccess: "token",
					title: "E2E workspace",
					updatedAt: state.updatedAt,
					writeAccess: "token",
				},
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/tree`
		) {
			const files = currentWorkspaceFiles(state);
			await route.fulfill({
				contentType: "application/json",
				json: {
					files: files.map(({ content: _content, ...file }) => file),
					workspaceId: WORKSPACE_ID,
				},
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/files`
		) {
			const file = findWorkspaceFile(
				state,
				url.searchParams.get("path") ?? state.path
			);
			await route.fulfill({
				contentType: "application/json",
				json: file
					? {
							...file,
							workspaceId: state.workspaceId,
						}
					: { error: "file_not_found" },
				status: file ? 200 : 404,
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/events`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: {
					events: state.events,
					workspaceId: WORKSPACE_ID,
				},
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/admin/stats`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: state.adminStatsError
					? { message: "Admin stats unavailable." }
					: adminStatsPayload(state),
				status: state.adminStatsError ? 500 : 200,
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/capabilities`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: capabilitiesPayload(state),
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/export`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: workspaceExportPayload(state),
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/workspaces/import") {
			await route.fulfill({
				contentType: "application/json",
				json: {
					editUrl: `${WEB_ORIGIN}/w/imported-workspace?edit=${NEXT_EDIT_TOKEN}`,
					id: "imported-workspace",
					importedCounts: {
						adminEvents: state.adminEvents.length,
						comments: state.comments.length,
						events: state.events.length,
						files: 1,
						fileVersions: state.versions.length,
					},
					rawUrl: `${API_ORIGIN}/w/imported-workspace/raw?k=${NEXT_READ_TOKEN}`,
					sourceWorkspaceId: WORKSPACE_ID,
					workspaceUrl: `${WEB_ORIGIN}/w/imported-workspace?k=${NEXT_READ_TOKEN}`,
				},
				status: 201,
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/retention`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: retentionPolicyPayload(),
			});
			return;
		}

		if (
			method === "POST" &&
			url.pathname ===
				`/api/workspaces/${WORKSPACE_ID}/capabilities/read/rotate`
		) {
			state.capabilities.readTokenActive = true;
			await route.fulfill({
				contentType: "application/json",
				json: {
					...capabilitiesPayload(state),
					capability: "read",
					links: {
						rawUrl: `${API_ORIGIN}/w/${WORKSPACE_ID}/raw?k=${NEXT_READ_TOKEN}`,
						workspaceUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${NEXT_READ_TOKEN}`,
					},
				},
			});
			return;
		}

		if (
			method === "POST" &&
			url.pathname ===
				`/api/workspaces/${WORKSPACE_ID}/capabilities/edit/rotate`
		) {
			state.capabilities.editTokenActive = true;
			state.capabilities.writeAccess = "token";
			await route.fulfill({
				contentType: "application/json",
				json: {
					...capabilitiesPayload(state),
					capability: "edit",
					links: {
						editUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${NEXT_EDIT_TOKEN}`,
					},
				},
			});
			return;
		}

		if (
			method === "POST" &&
			url.pathname ===
				`/api/workspaces/${WORKSPACE_ID}/capabilities/read/revoke`
		) {
			state.capabilities.readTokenActive = false;
			await route.fulfill({
				contentType: "application/json",
				json: {
					...capabilitiesPayload(state),
					capability: "read",
					revoked: true,
				},
			});
			return;
		}

		if (
			method === "POST" &&
			url.pathname ===
				`/api/workspaces/${WORKSPACE_ID}/capabilities/edit/revoke`
		) {
			state.capabilities.editTokenActive = false;
			state.capabilities.writeAccess = "none";
			await route.fulfill({
				contentType: "application/json",
				json: {
					...capabilitiesPayload(state),
					capability: "edit",
					revoked: true,
				},
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/files/versions`
		) {
			const requestedPath = url.searchParams.get("path") ?? state.path;
			const requestedFile = findWorkspaceFile(state, requestedPath);
			const { versions: stateVersions } = state;
			let versions: WorkspaceVersionState[] = [];
			if (requestedPath === state.path) {
				versions = stateVersions;
			} else if (requestedFile) {
				versions = [versionFromCurrentFile(requestedFile)];
			}
			await route.fulfill({
				contentType: "application/json",
				json: {
					path: requestedPath,
					versions: versions.map(versionMetadata),
					workspaceId: WORKSPACE_ID,
				},
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/comments`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: {
					comments: state.comments.filter(
						(comment) => comment.path === url.searchParams.get("path")
					),
					workspaceId: WORKSPACE_ID,
				},
			});
			return;
		}

		if (
			method === "POST" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/comments`
		) {
			const body = (await request.postDataJSON()) as Record<string, unknown>;
			options.onComment?.(body);
			const comment = createCommentState(state, body);
			state.comments.push(comment);
			await route.fulfill({
				contentType: "application/json",
				json: comment,
				status: 201,
			});
			return;
		}

		if (
			method === "POST" &&
			url.pathname.startsWith(`/api/workspaces/${WORKSPACE_ID}/comments/`) &&
			url.pathname.endsWith("/resolve")
		) {
			const commentId = url.pathname
				.slice(`/api/workspaces/${WORKSPACE_ID}/comments/`.length)
				.replace(RESOLVE_SUFFIX_PATTERN, "");
			const comment = state.comments.find((item) => item.id === commentId);
			if (comment) {
				comment.resolvedAt = "2026-07-08T00:03:00.000Z";
				comment.resolvedBy = "web";
				comment.updatedAt = "2026-07-08T00:03:00.000Z";
			}
			await route.fulfill({
				contentType: "application/json",
				json: comment ?? { error: "comment_not_found" },
				status: comment ? 200 : 404,
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname.startsWith(`/api/workspaces/${WORKSPACE_ID}/files/versions/`)
		) {
			const version = Number(
				url.pathname.slice(
					`/api/workspaces/${WORKSPACE_ID}/files/versions/`.length
				)
			);
			const historicalVersion = state.versions.find(
				(item) => item.version === version
			);
			await route.fulfill({
				contentType: "application/json",
				json: historicalVersion ?? { error: "file_version_not_found" },
				status: historicalVersion ? 200 : 404,
			});
			return;
		}

		if (
			method === "PUT" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/files`
		) {
			const body = (await request.postDataJSON()) as Record<string, unknown>;
			options.onSave?.(body);

			if (options.conflictOnFirstSave && !hasConflicted) {
				hasConflicted = true;
				applyFileChange(state, {
					actor: "agent-context-b",
					content: "# Latest\n\nRemote content.\n",
					updatedAt: "2026-07-08T00:01:00.000Z",
				});
				await route.fulfill({
					contentType: "application/json",
					json: {
						error: "version_conflict",
						latest: state,
						message: "File changed since baseVersion.",
					},
					status: 409,
				});
				return;
			}

			applyFileChange(state, {
				actor: String(body.actor ?? "web"),
				content: String(body.content ?? state.content),
				updatedAt: "2026-07-08T00:01:00.000Z",
			});
			await route.fulfill({
				contentType: "application/json",
				json: {
					path: state.path,
					updatedAt: state.updatedAt,
					updatedBy: state.updatedBy,
					version: state.version,
					workspaceId: WORKSPACE_ID,
				},
			});
			return;
		}

		await route.fulfill({
			contentType: "application/json",
			json: { error: "not_found" },
			status: 404,
		});
	});
}

function capabilitiesPayload(state: WorkspaceFileState) {
	return {
		capabilities: {
			edit: {
				access: state.capabilities.writeAccess,
				canRevoke: state.capabilities.writeAccess !== "none",
				canRotate: state.capabilities.writeAccess !== "none",
				tokenActive: state.capabilities.editTokenActive,
			},
			read: {
				access: "token",
				canRevoke: state.capabilities.readTokenActive,
				canRotate: true,
				tokenActive: state.capabilities.readTokenActive,
			},
		},
		workspaceId: WORKSPACE_ID,
	};
}

function currentWorkspaceFiles(state: WorkspaceFileState) {
	return [
		{
			content: state.content,
			contentType: state.contentType,
			path: state.path,
			updatedAt: state.updatedAt,
			updatedBy: state.updatedBy,
			version: state.version,
		},
		...state.extraFiles,
	];
}

function findWorkspaceFile(state: WorkspaceFileState, path: string) {
	return (
		currentWorkspaceFiles(state).find((file) => file.path === path) ?? null
	);
}

function versionFromCurrentFile(
	file: WorkspaceCurrentFileState
): WorkspaceVersionState {
	return {
		content: file.content,
		contentType: file.contentType,
		createdAt: file.updatedAt,
		path: file.path,
		sha256: null,
		sizeBytes: file.content.length,
		updatedBy: file.updatedBy,
		version: file.version,
		workspaceId: WORKSPACE_ID,
	};
}

function applyFileChange(
	state: WorkspaceFileState,
	{
		actor,
		content,
		updatedAt,
	}: {
		actor: string;
		content: string;
		updatedAt: string;
	}
) {
	state.content = content;
	state.updatedAt = updatedAt;
	state.updatedBy = actor;
	state.version += 1;
	state.versions.push({
		content,
		contentType: state.contentType,
		createdAt: updatedAt,
		path: state.path,
		sha256: `sha-${state.version}`,
		sizeBytes: content.length,
		updatedBy: actor,
		version: state.version,
		workspaceId: WORKSPACE_ID,
	});
	state.events.push({
		actor,
		createdAt: updatedAt,
		id: `event-${state.events.length + 1}`,
		path: state.path,
		payload: { baseVersion: state.version - 1 },
		type: "file.updated",
		version: state.version,
		workspaceId: WORKSPACE_ID,
	});
}

function createCommentState(
	state: WorkspaceFileState,
	body: Record<string, unknown>
): WorkspaceCommentState {
	const selector = body.selector as { line?: number } | undefined;
	return {
		anchor: selector ?? {},
		authorId: String(body.actor ?? "web"),
		body: String(body.body ?? ""),
		createdAt: "2026-07-08T00:02:30.000Z",
		id: `comment-${state.comments.length + 1}`,
		path: String(body.path ?? state.path),
		resolvedAt: null,
		resolvedBy: null,
		updatedAt: "2026-07-08T00:02:30.000Z",
		version: Number(body.version ?? state.version),
		workspaceId: WORKSPACE_ID,
	};
}

function workspaceExportPayload(state: WorkspaceFileState) {
	return {
		adminEvents: state.adminEvents,
		comments: state.comments.map(
			({ id: _id, workspaceId: _workspaceId, ...comment }) => comment
		),
		events: state.events.map(
			({ id: _id, workspaceId: _workspaceId, ...event }) => event
		),
		exportedAt: "2026-07-08T00:05:00.000Z",
		files: [
			{
				content: state.content,
				contentType: state.contentType,
				createdAt: "2026-07-08T00:00:00.000Z",
				path: state.path,
				updatedAt: state.updatedAt,
				updatedBy: state.updatedBy,
				version: state.version,
			},
		],
		fileVersions: state.versions.map((version) => ({
			content: version.content,
			contentType: version.contentType,
			createdAt: version.createdAt,
			path: version.path,
			updatedBy: version.updatedBy,
			version: version.version,
		})),
		format: "mdsync.workspace-export.v1",
		retention: retentionPolicyPayload().retention,
		schemaVersion: 1,
		workspace: {
			createdAt: "2026-07-08T00:00:00.000Z",
			id: WORKSPACE_ID,
			readAccess: "token",
			title: "E2E workspace",
			totalSizeBytes: state.content.length,
			updatedAt: state.updatedAt,
			writeAccess: "token",
		},
	};
}

function retentionPolicyPayload() {
	return {
		generatedAt: "2026-07-08T00:05:00.000Z",
		retention: {
			coverage: [
				"workspaces",
				"file versions",
				"protocol events",
				"comments",
				"admin events",
				"orphaned objects",
			],
			perWorkspaceD1: {
				status: "deferred",
			},
			status: "manual",
		},
		workspaceId: WORKSPACE_ID,
	};
}

function adminStatsPayload(state: WorkspaceFileState) {
	const files = currentWorkspaceFiles(state);
	const eventCounts = countByName(state.events.map((event) => event.type));
	const unresolvedComments = state.comments.filter(
		(comment) => !comment.resolvedAt
	);
	const staleAnchors = unresolvedComments.filter(
		(comment) => comment.version < state.version
	);
	const conflictEvents = state.adminEvents.filter(
		(event) => event.type === "file.version_conflict"
	);
	const taskFiles = files
		.filter((file) => file.path.startsWith("tasks/"))
		.map((file) => ({
			path: file.path,
			state: taskStateFromContent(file.content),
			version: file.version,
		}));
	const taskStates = taskFiles.flatMap((file) =>
		file.state ? [file.state] : []
	);
	const issues = [
		...(conflictEvents.length > 0
			? ["Version conflicts were observed for this workspace."]
			: []),
		...(staleAnchors.length > 0
			? ["Unresolved comments are anchored to older file versions."]
			: []),
	];

	return {
		cleanup: {
			failedJobs: 0,
			latestFailureAt: null,
			orphanedObjects: {
				count: null,
				status: "not_scanned",
			},
		},
		comments: {
			resolved: state.comments.length - unresolvedComments.length,
			staleAnchors: staleAnchors.length,
			total: state.comments.length,
			unresolved: unresolvedComments.length,
		},
		conflicts: {
			recent: conflictEvents,
			total: conflictEvents.length,
		},
		events: {
			byType: eventCounts,
			recent: state.events.toReversed(),
			total: state.events.length,
		},
		files: {
			currentCount: files.length,
			latestUpdatedAt: state.updatedAt,
			totalSizeBytes: sumFileSizes(files),
		},
		generatedAt: "2026-07-08T00:04:00.000Z",
		health: {
			issues,
			status: issues.length === 0 ? "healthy" : "attention",
		},
		retention: {
			coverage: [
				"workspaces",
				"file versions",
				"protocol events",
				"comments",
				"admin events",
				"orphaned objects",
			],
			status: "not_configured",
		},
		storage: {
			activeBytes: sumFileSizes(files),
			currentFileRecords: files.length,
			indexedObjects: state.versions.length,
			r2Prefix: `workspaces/${WORKSPACE_ID}`,
			versionBytes: state.versions.reduce(
				(total, version) => total + version.sizeBytes,
				0
			),
			versionRecords: state.versions.length,
		},
		tasks: {
			byState: countByName(taskStates),
			files: taskFiles,
			missingState: taskFiles.filter((file) => !file.state).length,
			total: taskFiles.length,
		},
		versions: {
			pathsWithHistory: state.versions.length > 1 ? 1 : 0,
			totalCount: state.versions.length,
		},
		workspace: {
			createdAt: "2026-07-08T00:00:00.000Z",
			fileCount: files.length,
			id: WORKSPACE_ID,
			lastAccessedAt: null,
			readAccess: "token",
			title: "E2E workspace",
			totalSizeBytes: sumFileSizes(files),
			updatedAt: state.updatedAt,
			writeAccess: "token",
		},
		workspaceId: WORKSPACE_ID,
	};
}

function countByName(names: string[]) {
	const counts = new Map<string, number>();
	for (const name of names) {
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts.entries()].map(([name, count]) => ({ count, name }));
}

function sumFileSizes(files: WorkspaceCurrentFileState[]) {
	return files.reduce((total, file) => total + file.content.length, 0);
}

function taskStateFromContent(content: string) {
	return TASK_STATE_PATTERN.exec(content)?.[1] ?? null;
}

function versionMetadata(version: WorkspaceVersionState) {
	return {
		contentType: version.contentType,
		createdAt: version.createdAt,
		path: version.path,
		sha256: version.sha256,
		sizeBytes: version.sizeBytes,
		updatedBy: version.updatedBy,
		version: version.version,
		workspaceId: version.workspaceId,
	};
}

function collectConsoleErrors(page: Page) {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(message.text());
		}
	});
	page.on("pageerror", (error) => {
		errors.push(error.message);
	});
	return errors;
}
