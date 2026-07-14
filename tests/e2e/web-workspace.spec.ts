import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route, test } from "@playwright/test";

const API_ORIGIN = "http://localhost:4300";
const WEB_ORIGIN = "http://localhost:4173";
const WORKSPACE_ID = "ws-foundation";
const EDIT_TOKEN = "edit-token";
const READ_TOKEN = "read-token";
const NOW = "2026-07-14T10:00:00.000Z";
const HISTORY_PANEL_URL = /panel=history/u;
const COMMENTS_PANEL_URL = /panel=comments/u;
const VERSION_ONE_NAME = /Version 1/u;

interface MockFile {
	content: string;
	contentType: string;
	createdAt: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

interface MockState {
	comments: Array<{
		anchor: Record<string, unknown>;
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
	}>;
	conflictOnNextSave: boolean;
	editToken: string | null;
	events: Array<{
		actor: string | null;
		createdAt: string;
		id: string;
		path: string | null;
		payload: Record<string, unknown>;
		type: string;
		version: number | null;
		workspaceId: string;
	}>;
	files: Map<string, MockFile>;
	lastCreateBody: Record<string, unknown> | null;
	readToken: string | null;
	title: string;
}

test.use({ colorScheme: "light" });

test("guided creation reaches a work-first overview with private share links", async ({
	page,
}) => {
	const state = createState();
	await mockApi(page, state);
	await page.goto(`${WEB_ORIGIN}/new`);

	await expect(page).toHaveScreenshot("mdsync-create.png", {
		animations: "disabled",
		fullPage: true,
	});
	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByLabel("Workspace title").fill("Launch room");
	await page
		.getByRole("textbox", { name: "Purpose" })
		.fill("Coordinate launch work and review durable evidence.");
	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByRole("button", { name: "Create workspace" }).click();

	await expect(page).toHaveURL(
		`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`
	);
	await expect(
		page.getByRole("dialog", { name: "Workspace links" })
	).toBeVisible();
	expect(
		(state.lastCreateBody?.files as Array<{ path: string }>).map(
			(file) => file.path
		)
	).toEqual(["README.md", "STATUS.md", "tasks/START-001.md"]);
	await page.getByRole("button", { name: "Close share dialog" }).click();
	await expect(
		page.getByRole("heading", { name: "Workspace overview" })
	).toBeVisible();
	await expect(
		page.getByText("Start Define the first delivery milestone")
	).toBeVisible();
	await expect(page).toHaveScreenshot("mdsync-overview.png", {
		animations: "disabled",
		fullPage: true,
	});
	await expectNoSeriousAxeViolations(page);
});

test("read links land on Overview and responsive navigation stays review-first", async ({
	page,
}) => {
	const state = createState();
	await mockApi(page, state);
	await page.setViewportSize({ height: 900, width: 900 });
	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${READ_TOKEN}`);
	await expect(
		page.getByRole("navigation", { name: "Mobile workspace navigation" })
	).toBeHidden();
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(page.locator(".workspace-rail.open")).toBeVisible();
	await expect(page.getByText("Viewing durable state")).toBeVisible();
	await page.getByRole("button", { name: "Close navigation" }).last().click();

	await page.setViewportSize({ height: 844, width: 390 });

	await expect(
		page.getByRole("heading", { name: "Workspace overview" })
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
	await expect(
		page.getByRole("button", { exact: true, name: "Edit" })
	).toHaveCount(0);
	await expect(
		page.getByRole("navigation", { name: "Mobile workspace navigation" })
	).toBeVisible();
	await expect(page).toHaveScreenshot("mdsync-mobile-overview.png", {
		animations: "disabled",
		fullPage: true,
	});
	await expectNoSeriousAxeViolations(page);
});

test("editing is preview-first, dirty-aware, draft-safe, and conflict-safe", async ({
	page,
}) => {
	const state = createState();
	await mockApi(page, state);
	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await page.getByRole("link", { exact: true, name: "Files" }).click();

	await expect(page.getByText("Initial workspace content.")).toBeVisible();
	await page.getByRole("button", { exact: true, name: "Edit" }).click();
	await expect(
		page.getByRole("button", { name: "Save changes" })
	).toBeDisabled();
	const editor = page.locator(".markdown-editor-content");
	await editor.fill("# Demo workspace\n\nMy local draft.\n");
	await expect(
		page.getByRole("button", { name: "Save changes" })
	).toBeEnabled();
	await page.waitForTimeout(650);
	await page.reload();
	await page.getByRole("button", { exact: true, name: "Edit" }).click();
	await expect(page.locator(".markdown-editor-content")).toContainText(
		"My local draft."
	);

	state.conflictOnNextSave = true;
	await page.getByRole("button", { name: "Save changes" }).click();
	await expect(
		page.getByRole("dialog", { name: "This document changed elsewhere." })
	).toBeVisible();
	const conflictDialog = page.getByRole("dialog", {
		name: "This document changed elsewhere.",
	});
	await expect(conflictDialog.locator("pre").first()).toContainText(
		"My local draft."
	);
	await expect(conflictDialog.locator("pre").nth(1)).toContainText(
		"Remote update."
	);
	await expect(page).toHaveScreenshot("mdsync-conflict.png", {
		animations: "disabled",
	});
	await page.getByRole("button", { name: "Edit merged version" }).click();
	await expect(page.locator(".markdown-editor-content")).toContainText(
		"My local draft."
	);
	await page.getByRole("button", { name: "Save changes" }).click();
	await expect(page.getByText("Saved as version 3.")).toBeVisible();
	await expect(page.locator(".markdown-editor-content")).toHaveCount(0);
});

test("comments and history are contextual, addressable, and browser-navigable", async ({
	page,
}) => {
	const state = createState();
	state.comments.push({
		anchor: { line: 1 },
		authorId: "reviewer",
		body: "Clarify the opening.",
		createdAt: NOW,
		id: "comment-1",
		path: "README.md",
		resolvedAt: null,
		resolvedBy: null,
		updatedAt: NOW,
		version: 1,
		workspaceId: WORKSPACE_ID,
	});
	await mockApi(page, state);
	await page.goto(
		`${WEB_ORIGIN}/w/${WORKSPACE_ID}/files/README.md?edit=${EDIT_TOKEN}&panel=comments`
	);

	await expect(page.getByText("Initial workspace content.")).toBeVisible();
	await expect(page.getByText("Clarify the opening.")).toBeVisible();
	await page.getByRole("button", { name: "History" }).click();
	await expect(page).toHaveURL(HISTORY_PANEL_URL);
	await expect(
		page.getByRole("button", { name: VERSION_ONE_NAME }).first()
	).toBeVisible();
	await expect(page).toHaveScreenshot("mdsync-document-inspector.png", {
		animations: "disabled",
		fullPage: true,
	});
	await page.goBack();
	await expect(page).toHaveURL(COMMENTS_PANEL_URL);
	await expect(page.getByText("Clarify the opening.")).toBeVisible();
	await page.reload();
	await expect(page.getByText("Clarify the opening.")).toBeVisible();
});

test("settings confirm capability rotation and revoke the current edit session", async ({
	page,
}) => {
	const state = createState();
	await mockApi(page, state);
	await page.goto(`${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`);
	await page.getByRole("link", { name: "Settings" }).click();
	await expect(
		page.getByRole("heading", { name: "Workspace health" })
	).toBeVisible();
	await expect(page.getByText("Sharing & access")).toBeVisible();
	await expect(page).toHaveScreenshot("mdsync-settings.png", {
		animations: "disabled",
		fullPage: true,
	});

	await page.getByRole("button", { name: "Rotate" }).first().click();
	await page.getByRole("button", { name: "Create read link" }).click();
	await expect(page.getByText("Read link rotated.")).toBeVisible();
	await page.getByRole("button", { name: "Revoke" }).nth(1).click();
	await page.getByRole("button", { name: "Revoke edit link" }).click();
	await expect(page).toHaveURL(`${WEB_ORIGIN}/w/${WORKSPACE_ID}`);
	await expect(
		page.getByRole("heading", { name: "Workspace overview" })
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
});

async function expectNoSeriousAxeViolations(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag22aa"])
		.analyze();
	const serious = results.violations.filter(
		(violation) =>
			violation.impact === "critical" || violation.impact === "serious"
	);
	expect(serious).toEqual([]);
}

function createState(): MockState {
	const files = new Map<string, MockFile>();
	files.set(
		"README.md",
		createFile("README.md", "# Demo workspace\n\nInitial workspace content.\n")
	);
	files.set(
		"tasks/START-001.md",
		createFile(
			"tasks/START-001.md",
			"---\nid: START-001\ntitle: Define the first delivery milestone\nstate: ready\nowner: null\n---\n\n# Define the first delivery milestone\n"
		)
	);
	return {
		comments: [],
		conflictOnNextSave: false,
		editToken: EDIT_TOKEN,
		events: [
			{
				actor: "workspace-create",
				createdAt: NOW,
				id: "event-1",
				path: "README.md",
				payload: {},
				type: "file.created",
				version: 1,
				workspaceId: WORKSPACE_ID,
			},
		],
		files,
		lastCreateBody: null,
		readToken: READ_TOKEN,
		title: "Demo workspace",
	};
}

function createFile(path: string, content: string, version = 1): MockFile {
	return {
		content,
		contentType: "text/markdown; charset=utf-8",
		createdAt: NOW,
		path,
		sha256: null,
		sizeBytes: content.length,
		updatedAt: NOW,
		updatedBy: "workspace-create",
		version,
		workspaceId: WORKSPACE_ID,
	};
}

async function mockApi(page: Page, state: MockState) {
	await page.route(`${API_ORIGIN}/**`, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const method = request.method();
		const path = url.pathname;

		if (method === "POST" && path === "/api/workspaces") {
			const body = request.postDataJSON() as Record<string, unknown>;
			state.lastCreateBody = body;
			state.title = String(body.title ?? state.title);
			state.files = new Map(
				(body.files as Array<{ content: string; path: string }>).map((file) => [
					file.path,
					createFile(file.path, file.content),
				])
			);
			await json(
				route,
				{
					createdAt: NOW,
					editUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${EDIT_TOKEN}`,
					id: WORKSPACE_ID,
					rawUrl: `${API_ORIGIN}/w/${WORKSPACE_ID}/raw?k=${READ_TOKEN}`,
					title: state.title,
					workspaceUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${READ_TOKEN}`,
				},
				201
			);
			return;
		}

		if (method === "GET" && path === `/api/workspaces/${WORKSPACE_ID}`) {
			await json(route, {
				createdAt: NOW,
				id: WORKSPACE_ID,
				readAccess: "token",
				title: state.title,
				updatedAt: NOW,
				writeAccess: state.editToken ? "token" : "none",
			});
			return;
		}
		if (method === "GET" && path === `/api/workspaces/${WORKSPACE_ID}/tree`) {
			await json(route, {
				files: [...state.files.values()].map(
					({
						content: _content,
						createdAt: _createdAt,
						sha256: _sha256,
						sizeBytes: _sizeBytes,
						workspaceId: _workspaceId,
						...file
					}) => file
				),
				workspaceId: WORKSPACE_ID,
			});
			return;
		}
		if (
			method === "GET" &&
			path === `/api/workspaces/${WORKSPACE_ID}/overview`
		) {
			await json(route, overviewPayload(state));
			return;
		}
		if (method === "GET" && path === `/api/workspaces/${WORKSPACE_ID}/events`) {
			await json(route, { events: state.events, workspaceId: WORKSPACE_ID });
			return;
		}
		if (
			method === "GET" &&
			path === `/api/workspaces/${WORKSPACE_ID}/activity`
		) {
			await json(route, {
				items: activityItems(state),
				workspaceId: WORKSPACE_ID,
			});
			return;
		}
		if (path === `/api/workspaces/${WORKSPACE_ID}/files/versions`) {
			const file = state.files.get(url.searchParams.get("path") ?? "");
			await json(route, {
				path: file?.path ?? "",
				versions: file ? [versionMetadata(file)] : [],
				workspaceId: WORKSPACE_ID,
			});
			return;
		}
		if (method === "GET" && path.includes("/files/versions/")) {
			const file = state.files.get(url.searchParams.get("path") ?? "");
			await json(
				route,
				file
					? { content: file.content, ...versionMetadata(file) }
					: { error: "file_not_found" },
				file ? 200 : 404
			);
			return;
		}
		if (path === `/api/workspaces/${WORKSPACE_ID}/files` && method === "GET") {
			const file = state.files.get(url.searchParams.get("path") ?? "");
			await json(
				route,
				file ? currentFilePayload(file) : { error: "file_not_found" },
				file ? 200 : 404
			);
			return;
		}
		if (path === `/api/workspaces/${WORKSPACE_ID}/files` && method === "PUT") {
			const body = request.postDataJSON() as {
				actor: string;
				content: string;
				path: string;
			};
			const current = state.files.get(body.path);
			if (state.conflictOnNextSave && current) {
				state.conflictOnNextSave = false;
				const remote = createFile(
					body.path,
					"# Demo workspace\n\nRemote update.\n",
					current.version + 1
				);
				remote.updatedBy = "remote-agent";
				state.files.set(body.path, remote);
				await json(
					route,
					{
						error: "version_conflict",
						latest: currentFilePayload(remote),
						message: "Changed elsewhere.",
					},
					409
				);
				return;
			}
			const next = createFile(
				body.path,
				body.content,
				(current?.version ?? 0) + 1
			);
			next.updatedBy = body.actor;
			state.files.set(body.path, next);
			state.events.push({
				actor: body.actor,
				createdAt: NOW,
				id: `event-${state.events.length + 1}`,
				path: body.path,
				payload: {},
				type: current ? "file.updated" : "file.created",
				version: next.version,
				workspaceId: WORKSPACE_ID,
			});
			await json(route, {
				path: next.path,
				updatedAt: next.updatedAt,
				updatedBy: next.updatedBy,
				version: next.version,
				workspaceId: WORKSPACE_ID,
			});
			return;
		}
		if (
			path === `/api/workspaces/${WORKSPACE_ID}/comments` &&
			method === "GET"
		) {
			const selected = url.searchParams.get("path");
			await json(route, {
				comments: state.comments.filter(
					(comment) => !selected || comment.path === selected
				),
				workspaceId: WORKSPACE_ID,
			});
			return;
		}
		if (path.endsWith("/resolve") && method === "POST") {
			const id = path.split("/").at(-2);
			const comment = state.comments.find((item) => item.id === id);
			if (comment) {
				comment.resolvedAt = NOW;
				comment.resolvedBy = "web";
			}
			await json(route, comment ?? { error: "not_found" }, comment ? 200 : 404);
			return;
		}
		if (
			path === `/api/workspaces/${WORKSPACE_ID}/comments` &&
			method === "POST"
		) {
			const body = request.postDataJSON() as {
				actor: string;
				body: string;
				path: string;
				selector?: Record<string, unknown>;
				version: number;
			};
			const comment = {
				anchor: body.selector ?? {},
				authorId: body.actor,
				body: body.body,
				createdAt: NOW,
				id: `comment-${state.comments.length + 1}`,
				path: body.path,
				resolvedAt: null,
				resolvedBy: null,
				updatedAt: NOW,
				version: body.version,
				workspaceId: WORKSPACE_ID,
			};
			state.comments.push(comment);
			await json(route, comment, 201);
			return;
		}
		if (
			path === `/api/workspaces/${WORKSPACE_ID}/capabilities` &&
			method === "GET"
		) {
			await json(route, capabilityPayload(state));
			return;
		}
		if (path.includes("/capabilities/") && method === "POST") {
			const capability = path.includes("/read/") ? "read" : "edit";
			if (path.endsWith("/revoke")) {
				if (capability === "edit") {
					state.editToken = null;
				} else {
					state.readToken = null;
				}
				await json(route, {
					...capabilityPayload(state),
					capability,
					revoked: true,
				});
				return;
			}
			if (capability === "read") {
				state.readToken = "next-read-token";
			} else {
				state.editToken = "next-edit-token";
			}
			await json(route, {
				...capabilityPayload(state),
				capability,
				links:
					capability === "read"
						? {
								rawUrl: `${API_ORIGIN}/w/${WORKSPACE_ID}/raw?k=${state.readToken}`,
								workspaceUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?k=${state.readToken}`,
							}
						: {
								editUrl: `${WEB_ORIGIN}/w/${WORKSPACE_ID}?edit=${state.editToken}`,
							},
			});
			return;
		}
		if (path === `/api/workspaces/${WORKSPACE_ID}/admin/stats`) {
			await json(route, adminStatsPayload(state));
			return;
		}
		if (path === `/api/workspaces/${WORKSPACE_ID}/retention`) {
			await json(route, {
				retention: {
					coverage: ["files"],
					perWorkspaceD1: { status: "deferred" },
					status: "manual",
				},
				workspaceId: WORKSPACE_ID,
			});
			return;
		}
		await json(route, { error: "not_found", message: path }, 404);
	});
}

function overviewPayload(state: MockState) {
	const task = state.files.get("tasks/START-001.md");
	const item = task
		? {
				id: "START-001",
				owner: null,
				path: task.path,
				priority: null,
				state: "ready",
				title: "Define the first delivery milestone",
				updatedBy: task.updatedBy,
				valid: true,
				version: task.version,
			}
		: null;
	return {
		activity: {
			recent: state.events
				.slice(-8)
				.reverse()
				.map(({ actor, createdAt, path, type, version }) => ({
					actor,
					createdAt,
					path,
					type,
					version,
				})),
		},
		comments: {
			staleAnchors: 0,
			total: state.comments.length,
			unresolved: state.comments.filter((comment) => !comment.resolvedAt)
				.length,
		},
		files: { latestUpdatedAt: NOW, total: state.files.size },
		generatedAt: NOW,
		tasks: {
			byState: [
				"ready",
				"claimed",
				"working",
				"blocked",
				"review",
				"done",
				"abandoned",
			].map((name) => ({ count: name === "ready" && item ? 1 : 0, name })),
			invalidCount: 0,
			items: item ? [item] : [],
			total: item ? 1 : 0,
		},
		workspaceId: WORKSPACE_ID,
	};
}

function activityItems(state: MockState) {
	const items = state.events.map((event) => ({
		actor: event.actor,
		createdAt: event.createdAt,
		id: `event:${event.id}`,
		path: event.path,
		source: "event",
		type: event.type,
		version: event.version,
	}));
	for (const comment of state.comments) {
		items.push({
			actor: comment.authorId,
			createdAt: comment.createdAt,
			id: `comment:${comment.id}:created`,
			path: comment.path,
			source: "comment",
			type: "comment.created",
			version: comment.version,
		});
		if (comment.resolvedAt) {
			items.push({
				actor: comment.resolvedBy,
				createdAt: comment.resolvedAt,
				id: `comment:${comment.id}:resolved`,
				path: comment.path,
				source: "comment",
				type: "comment.resolved",
				version: comment.version,
			});
		}
	}
	return items.sort(
		(left, right) =>
			right.createdAt.localeCompare(left.createdAt) ||
			left.id.localeCompare(right.id)
	);
}

function versionMetadata(file: MockFile) {
	const { content: _content, updatedAt: _updatedAt, ...metadata } = file;
	return metadata;
}

function currentFilePayload(file: MockFile) {
	return {
		content: file.content,
		contentType: file.contentType,
		path: file.path,
		updatedAt: file.updatedAt,
		updatedBy: file.updatedBy,
		version: file.version,
		workspaceId: file.workspaceId,
	};
}

function capabilityPayload(state: MockState) {
	return {
		capabilities: {
			edit: {
				access: state.editToken ? "token" : "none",
				canRevoke: Boolean(state.editToken),
				canRotate: Boolean(state.editToken),
				tokenActive: Boolean(state.editToken),
			},
			read: {
				access: "token",
				canRevoke: Boolean(state.readToken),
				canRotate: true,
				tokenActive: Boolean(state.readToken),
			},
		},
		workspaceId: WORKSPACE_ID,
	};
}

function adminStatsPayload(state: MockState) {
	return {
		cleanup: {
			failedJobs: 0,
			latestFailureAt: null,
			orphanedObjects: { count: null, status: "not_scanned" },
		},
		comments: {
			resolved: 0,
			staleAnchors: 0,
			total: state.comments.length,
			unresolved: state.comments.length,
		},
		conflicts: { recent: [], total: 0 },
		events: {
			byType: [{ count: state.events.length, name: "file.created" }],
			recent: state.events
				.slice(-5)
				.map(({ actor, createdAt, path, payload, type, version }) => ({
					actor,
					createdAt,
					path,
					payload,
					type,
					version,
				})),
			total: state.events.length,
		},
		files: {
			currentCount: state.files.size,
			latestUpdatedAt: NOW,
			totalSizeBytes: [...state.files.values()].reduce(
				(total, file) => total + file.sizeBytes,
				0
			),
		},
		generatedAt: NOW,
		health: { issues: [], status: "healthy" },
		retention: { coverage: ["files"], status: "not_configured" },
		storage: {
			activeBytes: 100,
			currentFileRecords: state.files.size,
			indexedObjects: state.files.size,
			r2Prefix: "workspace/private",
			versionBytes: 100,
			versionRecords: state.files.size,
		},
		tasks: {
			byState: [{ count: 1, name: "ready" }],
			files: [{ path: "tasks/START-001.md", state: "ready", version: 1 }],
			missingState: 0,
			total: 1,
		},
		versions: { pathsWithHistory: 0, totalCount: state.files.size },
		workspace: {
			createdAt: NOW,
			fileCount: state.files.size,
			id: WORKSPACE_ID,
			lastAccessedAt: NOW,
			readAccess: "token",
			title: state.title,
			totalSizeBytes: 100,
			updatedAt: NOW,
			writeAccess: state.editToken ? "token" : "none",
		},
		workspaceId: WORKSPACE_ID,
	};
}

async function json(route: Route, body: unknown, status = 200) {
	await route.fulfill({ contentType: "application/json", json: body, status });
}
