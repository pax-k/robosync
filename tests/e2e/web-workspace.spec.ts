import { expect, type Page, test } from "@playwright/test";

interface WorkspaceFileState {
	content: string;
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

const API_ORIGIN = "http://localhost:3000";
const WEB_ORIGIN = "http://localhost:5173";
const WORKSPACE_ID = "ws-e2e";
const EDIT_TOKEN = "edit-token";
const READ_TOKEN = "read-token";
const README_BUTTON_NAME_PATTERN = /README.md/;

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

function createWorkspaceState(): WorkspaceFileState {
	return {
		content: "# Demo\n\nInitial content.\n",
		contentType: "text/markdown; charset=utf-8",
		path: "README.md",
		updatedAt: "2026-07-08T00:00:00.000Z",
		updatedBy: "workspace-create",
		version: 1,
		workspaceId: WORKSPACE_ID,
	};
}

async function mockWorkspaceApi(
	page: Page,
	state: WorkspaceFileState,
	options: {
		conflictOnFirstSave?: boolean;
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
			await route.fulfill({
				contentType: "application/json",
				json: {
					files: [
						{
							contentType: state.contentType,
							path: state.path,
							updatedAt: state.updatedAt,
							updatedBy: state.updatedBy,
							version: state.version,
						},
					],
					workspaceId: WORKSPACE_ID,
				},
			});
			return;
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${WORKSPACE_ID}/files`
		) {
			await route.fulfill({
				contentType: "application/json",
				json: state,
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
				state.content = "# Latest\n\nRemote content.\n";
				state.updatedAt = "2026-07-08T00:01:00.000Z";
				state.updatedBy = "agent-context-b";
				state.version = 2;
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

			state.content = String(body.content ?? state.content);
			state.updatedAt = "2026-07-08T00:01:00.000Z";
			state.updatedBy = String(body.actor ?? "web");
			state.version += 1;
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
