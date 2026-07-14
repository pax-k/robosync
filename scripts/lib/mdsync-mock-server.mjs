import { createServer } from "node:http";

const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";
const BEARER_PREFIX_PATTERN = /^Bearer\s+/u;
const EXPORT_FORMAT = "mdsync.workspace-export.v1";
const FRONTMATTER_ID_PATTERN = /^id:\s*(.+)$/mu;
const TASK_FILE_PATTERN = /^tasks\/.+\.md$/u;

export const createMdsyncMockServer = () => {
	let server;
	let workspaceCounter = 0;
	const workspaces = new Map();

	const listener = (request, response) => {
		const route = routeRequest({
			nextWorkspaceCounter: () => {
				workspaceCounter += 1;
				return workspaceCounter;
			},
			request,
			response,
			workspaces,
		});
		Promise.resolve(route).catch((error) => {
			sendJson(
				response,
				{ error: "transport_error", message: error.message },
				500
			);
		});
	};

	return {
		close: () =>
			new Promise((resolve, reject) => {
				if (!server) {
					resolve();
					return;
				}
				server.close((error) => (error ? reject(error) : resolve()));
			}),
		start: () =>
			new Promise((resolve) => {
				server = createServer(listener);
				server.listen(0, "127.0.0.1", () => {
					const address = server.address();
					if (!address || typeof address === "string") {
						throw new Error("MDSync mock server did not expose a port.");
					}
					resolve({
						baseUrl: `http://127.0.0.1:${address.port}`,
					});
				});
			}),
	};
};

const routeRequest = ({
	nextWorkspaceCounter,
	request,
	response,
	workspaces,
}) => {
	const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
	const method = request.method ?? "GET";
	const parts = url.pathname.split("/").filter(Boolean);
	if (method === "GET" && url.pathname === "/.well-known/mdsync.json") {
		const origin = originFromRequest(request);
		return sendJson(response, {
			apiOrigin: origin,
			discoveryVersion: 1,
			product: "mdsync",
			webOrigin: origin,
		});
	}

	if (method === "POST" && url.pathname === "/api/workspaces") {
		return handleCreateWorkspace({
			request,
			response,
			workspaceCounter: nextWorkspaceCounter(),
			workspaces,
		});
	}

	if (method === "POST" && url.pathname === "/api/workspaces/import") {
		return handleImportWorkspace({
			request,
			response,
			workspaceCounter: nextWorkspaceCounter(),
			workspaces,
		});
	}

	if (parts[0] === "api" && parts[1] === "workspaces") {
		return handleApiWorkspaceRequest({
			method,
			parts,
			request,
			response,
			url,
			workspaces,
		});
	}

	if (parts[0] === "w" && parts[2] === "raw") {
		return handleRawWorkspaceRequest({
			parts,
			request,
			response,
			url,
			workspaces,
		});
	}

	return sendJson(response, { error: "not_found" }, 404);
};

const handleCreateWorkspace = async ({
	request,
	response,
	workspaceCounter,
	workspaces,
}) => {
	const body = await readJson(request);
	const workspace = createWorkspace({
		body,
		origin: originFromRequest(request),
		workspaceCounter,
	});
	workspaces.set(workspace.id, workspace);
	return sendJson(response, serializeCreatedWorkspace(workspace), 201);
};

const handleImportWorkspace = async ({
	request,
	response,
	workspaceCounter,
	workspaces,
}) => {
	const bundle = await readJson(request);
	const workspace = createWorkspaceFromBundle({
		bundle,
		origin: originFromRequest(request),
		workspaceCounter,
	});
	workspaces.set(workspace.id, workspace);
	return sendJson(
		response,
		{
			...serializeCreatedWorkspace(workspace),
			importedAt: workspace.now,
			importedCounts: {
				adminEvents: workspace.adminEvents.length,
				comments: workspace.comments.length,
				events: workspace.events.length,
				files: workspace.files.size,
				fileVersions: workspace.fileVersions.length,
			},
			sourceWorkspaceId: workspace.sourceWorkspaceId,
		},
		201
	);
};

const handleApiWorkspaceRequest = ({
	method,
	parts,
	request,
	response,
	url,
	workspaces,
}) => {
	const workspace = requireWorkspace(workspaces, parts[2]);
	if (!workspace) {
		return sendJson(response, { error: "workspace_not_found" }, 404);
	}
	return handleWorkspaceRequest({
		method,
		parts,
		request,
		response,
		url,
		workspace,
	});
};

const handleRawWorkspaceRequest = ({
	parts,
	request,
	response,
	url,
	workspaces,
}) => {
	const workspace = requireWorkspace(workspaces, parts[1]);
	if (!workspace) {
		return sendJson(response, { error: "workspace_not_found" }, 404);
	}
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	const rawPath = decodeURIComponent(parts.slice(3).join("/"));
	if (rawPath.length === 0) {
		return sendText(response, formatRawListing(workspace));
	}
	const file = workspace.files.get(rawPath);
	return file
		? sendText(response, file.content, file.contentType)
		: sendJson(response, { error: "file_not_found" }, 404);
};

const handleWorkspaceRequest = ({
	method,
	parts,
	request,
	response,
	url,
	workspace,
}) => {
	if (parts.length === 3 && method === "GET") {
		return handleWorkspaceMetadata({ request, response, url, workspace });
	}

	if (parts[3] === "tree" && method === "GET") {
		return handleWorkspaceTree({ request, response, url, workspace });
	}

	if (parts[3] === "overview" && method === "GET") {
		return handleWorkspaceOverview({ request, response, url, workspace });
	}

	if (parts[3] === "files" && parts[4] === "versions") {
		return handleFileVersionsRequest({
			parts,
			request,
			response,
			url,
			workspace,
		});
	}

	if (parts[3] === "files") {
		return handleFileRequest({ method, request, response, url, workspace });
	}

	if (parts[3] === "events" && method === "GET") {
		return handleWorkspaceEvents({ request, response, url, workspace });
	}

	if (parts[3] === "activity" && method === "GET") {
		return handleWorkspaceActivity({ request, response, url, workspace });
	}

	if (parts[3] === "comments") {
		return handleCommentRequest({
			method,
			parts,
			request,
			response,
			url,
			workspace,
		});
	}

	if (parts[3] === "capabilities") {
		return handleCapabilityRequest({
			method,
			parts,
			request,
			response,
			url,
			workspace,
		});
	}

	if (parts[3] === "admin" && parts[4] === "stats" && method === "GET") {
		return handleAdminStats({ request, response, url, workspace });
	}

	if (parts[3] === "export" && method === "GET") {
		return handleExport({ request, response, url, workspace });
	}

	if (parts[3] === "retention") {
		return handleRetentionRequest({
			method,
			parts,
			request,
			response,
			url,
			workspace,
		});
	}

	return sendJson(response, { error: "not_found" }, 404);
};

const handleWorkspaceMetadata = ({ request, response, url, workspace }) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	return sendJson(response, serializeWorkspace(workspace));
};

const handleWorkspaceTree = ({ request, response, url, workspace }) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	return sendJson(response, {
		files: [...workspace.files.values()].map((file) => ({
			contentType: file.contentType,
			path: file.path,
			updatedAt: file.updatedAt,
			updatedBy: file.updatedBy,
			version: file.version,
		})),
		workspaceId: workspace.id,
	});
};

const handleWorkspaceOverview = ({ request, response, url, workspace }) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	const files = [...workspace.files.values()];
	const taskItems = files
		.filter((file) => TASK_FILE_PATTERN.test(file.path))
		.map((file) => mockTaskItem(file))
		.sort(compareMockTaskItems);
	const states = [
		"ready",
		"claimed",
		"working",
		"blocked",
		"review",
		"done",
		"abandoned",
	];
	const unresolved = workspace.comments.filter(
		(comment) => !comment.resolvedAt
	);
	return sendJson(response, {
		activity: {
			recent: composeMockActivity(workspace)
				.slice(0, 8)
				.map(({ actor, createdAt, path, type, version }) => ({
					actor,
					createdAt,
					path,
					type,
					version,
				})),
		},
		comments: {
			staleAnchors: unresolved.filter((comment) => {
				const version = workspace.files.get(comment.path)?.version;
				return version && comment.version < version;
			}).length,
			total: workspace.comments.length,
			unresolved: unresolved.length,
		},
		files: {
			latestUpdatedAt:
				files
					.map((file) => file.updatedAt)
					.sort((left, right) => left.localeCompare(right))
					.at(-1) ?? null,
			total: files.length,
		},
		generatedAt: workspace.now,
		tasks: {
			byState: states.map((name) => ({
				count: taskItems.filter((item) => item.state === name).length,
				name,
			})),
			invalidCount: taskItems.filter((item) => !item.valid).length,
			items: taskItems,
			total: taskItems.length,
		},
		workspaceId: workspace.id,
	});
};

const mockTaskItem = (file) => {
	const value = (name) =>
		file.content.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"))?.[1]?.trim() ??
		null;
	const id = value("id");
	const title = value("title");
	const state = value("state");
	const ownerValue = value("owner");
	const priority = value("priority");
	const validStates = new Set([
		"ready",
		"claimed",
		"working",
		"blocked",
		"review",
		"done",
		"abandoned",
	]);
	const valid = Boolean(id && title && state && validStates.has(state));
	return {
		id,
		owner: ownerValue === "null" ? null : ownerValue,
		path: file.path,
		priority: ["urgent", "high", "medium", "low"].includes(priority)
			? priority
			: null,
		state: validStates.has(state) ? state : null,
		title,
		updatedBy: file.updatedBy,
		valid,
		version: file.version,
	};
};

const compareMockTaskItems = (left, right) => {
	const states = [
		"invalid",
		"blocked",
		"review",
		"working",
		"claimed",
		"ready",
		"done",
		"abandoned",
	];
	const priorities = ["urgent", "high", "medium", "low", null];
	const leftState = left.valid ? left.state : "invalid";
	const rightState = right.valid ? right.state : "invalid";
	return (
		states.indexOf(leftState) - states.indexOf(rightState) ||
		priorities.indexOf(left.priority) - priorities.indexOf(right.priority) ||
		left.path.localeCompare(right.path)
	);
};

const handleFileVersionsRequest = ({
	parts,
	request,
	response,
	url,
	workspace,
}) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	const path = url.searchParams.get("path") ?? "";
	if (parts[5]) {
		const version = Number(parts[5]);
		const fileVersion = workspace.fileVersions.find(
			(candidate) => candidate.path === path && candidate.version === version
		);
		return fileVersion
			? sendJson(response, fileVersion)
			: sendJson(response, { error: "file_not_found" }, 404);
	}
	return sendJson(response, {
		path,
		versions: workspace.fileVersions
			.filter((fileVersion) => fileVersion.path === path)
			.map(({ content: _content, ...metadata }) => metadata),
		workspaceId: workspace.id,
	});
};

const handleWorkspaceEvents = ({ request, response, url, workspace }) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	return sendJson(response, {
		events: workspace.events,
		workspaceId: workspace.id,
	});
};

const handleAdminStats = ({ request, response, url, workspace }) => {
	if (!hasEditAccess(workspace, request, url)) {
		return sendJson(response, { error: "missing_token" }, 401);
	}
	return sendJson(response, buildAdminStats(workspace));
};

const handleExport = ({ request, response, url, workspace }) => {
	if (!hasEditAccess(workspace, request, url)) {
		return sendJson(response, { error: "missing_token" }, 401);
	}
	return sendJson(response, exportWorkspace(workspace));
};

const handleRetentionRequest = ({
	method,
	parts,
	request,
	response,
	url,
	workspace,
}) => {
	if (!hasEditAccess(workspace, request, url)) {
		return sendJson(response, { error: "missing_token" }, 401);
	}
	if (parts[4] === "prune" && method === "POST") {
		return handleRetentionPrune({ request, response, workspace });
	}
	if (method === "GET") {
		return sendJson(response, retentionPayload(workspace));
	}
	return sendJson(response, { error: "not_found" }, 404);
};

const handleRetentionPrune = async ({ request, response, workspace }) =>
	sendJson(response, {
		before: (await readJson(request)).before,
		pruned: {
			adminEvents: 0,
			events: 0,
			fileVersionObjects: 0,
			fileVersions: 0,
			orphanedObjects: 0,
			resolvedComments: 0,
		},
		skipped: { orphanedObjects: 0 },
		workspaceId: workspace.id,
	});

const handleFileRequest = ({ method, request, response, url, workspace }) => {
	const path = url.searchParams.get("path") ?? "";
	if (method === "GET") {
		return handleReadFile({ path, request, response, url, workspace });
	}

	if (!hasEditAccess(workspace, request, url)) {
		return sendJson(response, { error: "missing_token" }, 401);
	}

	if (method === "PUT") {
		return handleWriteFile({ request, response, workspace });
	}

	if (method === "DELETE") {
		return handleDeleteFile({ path, request, response, workspace });
	}

	return sendJson(response, { error: "not_found" }, 404);
};

const handleReadFile = ({ path, request, response, url, workspace }) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	const file = workspace.files.get(path);
	return file
		? sendJson(response, serializeCurrentFile(file))
		: sendJson(response, { error: "file_not_found" }, 404);
};

const handleWriteFile = async ({ request, response, workspace }) => {
	if (workspace.writeAccess === "none") {
		return sendJson(response, { error: "write_disabled" }, 403);
	}
	const body = await readJson(request);
	const nextPath = String(body.path ?? "");
	const current = workspace.files.get(nextPath);
	const baseVersion = body.baseVersion ?? null;
	if (current && baseVersion !== current.version) {
		return sendVersionConflict({ current, response });
	}
	const file = {
		content: String(body.content ?? ""),
		contentType: String(body.contentType ?? DEFAULT_CONTENT_TYPE),
		createdAt: current?.createdAt ?? workspace.now,
		path: nextPath,
		sha256: null,
		sizeBytes: String(body.content ?? "").length,
		updatedAt: workspace.now,
		updatedBy: String(body.actor ?? "mdsync-mock"),
		version: current ? current.version + 1 : 1,
		workspaceId: workspace.id,
	};
	workspace.files.set(nextPath, file);
	workspace.fileVersions.push(serializeFileVersion(file));
	workspace.events.push({
		actor: file.updatedBy,
		createdAt: workspace.now,
		id: `event-${workspace.events.length + 1}`,
		path: nextPath,
		payload: { baseVersion },
		type: current ? "file.updated" : "file.created",
		version: file.version,
		workspaceId: workspace.id,
	});
	return sendJson(response, {
		path: file.path,
		updatedAt: file.updatedAt,
		updatedBy: file.updatedBy,
		version: file.version,
		workspaceId: workspace.id,
	});
};

const handleDeleteFile = async ({ path, request, response, workspace }) => {
	const body = await readJson(request);
	const current = workspace.files.get(path);
	if (!current) {
		return sendJson(response, { error: "file_not_found" }, 404);
	}
	if (body.baseVersion !== current.version) {
		return sendVersionConflict({ current, response });
	}
	workspace.files.delete(path);
	workspace.events.push({
		actor: String(body.actor ?? "mdsync-mock"),
		createdAt: workspace.now,
		id: `event-${workspace.events.length + 1}`,
		path,
		payload: { baseVersion: body.baseVersion },
		type: "file.deleted",
		version: current.version,
		workspaceId: workspace.id,
	});
	return sendJson(response, {
		deleted: true,
		deletedBy: String(body.actor ?? "mdsync-mock"),
		path,
		workspaceId: workspace.id,
	});
};

const sendVersionConflict = ({ current, response }) =>
	sendJson(
		response,
		{
			error: "version_conflict",
			latest: serializeCurrentFile(current),
			message: "File changed since baseVersion.",
		},
		409
	);

const handleCommentRequest = async ({
	method,
	parts,
	request,
	response,
	url,
	workspace,
}) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	if (method === "GET") {
		const path = url.searchParams.get("path");
		return sendJson(response, {
			comments: workspace.comments.filter(
				(comment) => !path || comment.path === path
			),
			workspaceId: workspace.id,
		});
	}
	if (!hasEditAccess(workspace, request, url)) {
		return sendJson(response, { error: "missing_token" }, 401);
	}
	if (method === "POST" && parts[5] === "resolve") {
		const comment = workspace.comments.find((item) => item.id === parts[4]);
		if (!comment) {
			return sendJson(response, { error: "comment_not_found" }, 404);
		}
		const body = await readJson(request);
		comment.resolvedAt = workspace.now;
		comment.resolvedBy = String(body.actor ?? "mdsync-mock");
		return sendJson(response, comment);
	}
	if (method === "POST") {
		const body = await readJson(request);
		const comment = {
			anchor: body.selector ?? {},
			authorId: String(body.actor ?? "mdsync-mock"),
			body: String(body.body ?? ""),
			createdAt: workspace.now,
			id: `comment-${workspace.comments.length + 1}`,
			path: String(body.path ?? ""),
			resolvedAt: null,
			resolvedBy: null,
			updatedAt: workspace.now,
			version: Number(body.version ?? 1),
			workspaceId: workspace.id,
		};
		workspace.comments.push(comment);
		return sendJson(response, comment, 201);
	}
	return sendJson(response, { error: "not_found" }, 404);
};

const handleWorkspaceActivity = ({ request, response, url, workspace }) => {
	if (!hasReadAccess(workspace, request, url)) {
		return sendJson(response, { error: "invalid_token" }, 403);
	}
	return sendJson(response, {
		items: composeMockActivity(workspace),
		workspaceId: workspace.id,
	});
};

const composeMockActivity = (workspace) => {
	const items = workspace.events.map((event) => ({
		actor: event.actor,
		createdAt: event.createdAt,
		id: `event:${event.id}`,
		path: event.path,
		source: "event",
		type: event.type,
		version: event.version,
	}));
	for (const comment of workspace.comments) {
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
};

const handleCapabilityRequest = ({
	method,
	parts,
	request,
	response,
	url,
	workspace,
}) => {
	if (!hasEditAccess(workspace, request, url)) {
		return sendJson(response, { error: "missing_token" }, 401);
	}
	if (parts.length === 4 && method === "GET") {
		return sendJson(response, capabilityPayload(workspace));
	}
	if (parts[5] === "rotate" && method === "POST") {
		if (parts[4] === "read") {
			workspace.readToken = `${workspace.readToken}-rotated`;
			return sendJson(response, {
				...capabilityPayload(workspace),
				capability: "read",
				links: readLinks(workspace),
			});
		}
		if (workspace.writeAccess === "none") {
			return sendJson(response, { error: "write_disabled" }, 403);
		}
		workspace.editToken = `${workspace.editToken}-rotated`;
		return sendJson(response, {
			...capabilityPayload(workspace),
			capability: "edit",
			links: editLinks(workspace),
		});
	}
	if (parts[5] === "revoke" && method === "POST") {
		if (parts[4] === "read") {
			workspace.readToken = null;
		} else {
			workspace.editToken = null;
			workspace.writeAccess = "none";
		}
		return sendJson(response, {
			...capabilityPayload(workspace),
			capability: parts[4] === "read" ? "read" : "edit",
			revoked: true,
		});
	}
	return sendJson(response, { error: "not_found" }, 404);
};

const createWorkspace = ({ body, origin, workspaceCounter }) => {
	const id = `workspace-${workspaceCounter}`;
	const workspace = {
		adminEvents: [],
		comments: [],
		editToken: "edit-token",
		events: [],
		files: new Map(),
		fileVersions: [],
		id,
		now: "2026-07-08T00:00:00.000Z",
		origin,
		readAccess: body.readAccess ?? "token",
		readToken: "read-token",
		title: body.title ?? null,
		writeAccess: body.writeAccess ?? "token",
	};
	const fileInputs = [...(body.files ?? [])];
	if (body.protocol?.kind === "ha2ha") {
		const taskId = String(
			fileInputs
				.find((file) => TASK_FILE_PATTERN.test(String(file.path ?? "")))
				?.content?.match(FRONTMATTER_ID_PATTERN)?.[1] ?? "TASK-001"
		).trim();
		fileInputs.push(
			{
				content: JSON.stringify(
					{
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
							rawFile: `/w/${id}/raw/{path}`,
							rawListing: `/w/${id}/raw`,
						},
						title: body.title ?? "HA2HA Workspace",
						workspaceId: id,
					},
					null,
					2
				),
				contentType: "application/json; charset=utf-8",
				path: ".ha2ha/workspace.json",
			},
			{
				content: `# ${body.title ?? "HA2HA Workspace"}\n`,
				path: "HA2HA.md",
			},
			{
				content: `# Status\n\n- ${taskId} is ready.\n`,
				path: "STATUS.md",
			},
			{
				content: `---\nid: ${body.actor}\ncan_edit: true\n---\n`,
				path: `participants/${body.actor}.md`,
			}
		);
	}
	for (const fileInput of deduplicateFileInputs(fileInputs)) {
		const file = {
			content: String(fileInput.content ?? ""),
			contentType: String(fileInput.contentType ?? DEFAULT_CONTENT_TYPE),
			createdAt: workspace.now,
			path: String(fileInput.path ?? ""),
			sha256: null,
			sizeBytes: String(fileInput.content ?? "").length,
			updatedAt: workspace.now,
			updatedBy: String(body.actor ?? "mdsync-mock"),
			version: 1,
			workspaceId: id,
		};
		workspace.files.set(file.path, file);
		workspace.fileVersions.push(serializeFileVersion(file));
		workspace.events.push({
			actor: file.updatedBy,
			createdAt: workspace.now,
			id: `event-${workspace.events.length + 1}`,
			path: file.path,
			payload: { sizeBytes: file.content.length },
			type: "file.created",
			version: 1,
			workspaceId: id,
		});
	}
	return workspace;
};

const deduplicateFileInputs = (files) => {
	const byPath = new Map();
	for (const file of files) {
		if (!byPath.has(file.path)) {
			byPath.set(file.path, file);
		}
	}
	return [...byPath.values()];
};

const createWorkspaceFromBundle = ({ bundle, origin, workspaceCounter }) => {
	const workspace = createWorkspace({
		body: {
			actor: "import",
			files: bundle.files ?? [],
			title: bundle.workspace?.title ?? "Imported workspace",
		},
		origin,
		workspaceCounter,
	});
	workspace.comments = bundle.comments ?? [];
	workspace.events = bundle.events ?? workspace.events;
	workspace.adminEvents = bundle.adminEvents ?? [];
	workspace.fileVersions = bundle.fileVersions ?? workspace.fileVersions;
	workspace.sourceWorkspaceId = bundle.workspace?.id;
	return workspace;
};

const serializeCreatedWorkspace = (workspace) => ({
	createdAt: workspace.now,
	editUrl: editLinks(workspace).editUrl,
	id: workspace.id,
	rawUrl: readLinks(workspace).rawUrl,
	title: workspace.title,
	workspaceUrl: readLinks(workspace).workspaceUrl,
});

const serializeWorkspace = (workspace) => ({
	createdAt: workspace.now,
	id: workspace.id,
	readAccess: workspace.readAccess,
	title: workspace.title,
	updatedAt: workspace.now,
	writeAccess: workspace.writeAccess,
});

const exportWorkspace = (workspace) => ({
	adminEvents: workspace.adminEvents,
	comments: workspace.comments.map(serializeExportComment),
	events: workspace.events.map(serializeExportEvent),
	exportedAt: workspace.now,
	files: [...workspace.files.values()].map(serializeExportFile),
	fileVersions: workspace.fileVersions.map(serializeExportFileVersion),
	format: EXPORT_FORMAT,
	retention: {
		coverage: ["file versions", "protocol events", "comments", "admin events"],
		perWorkspaceD1: { status: "deferred" },
		status: "manual",
	},
	schemaVersion: 1,
	workspace: {
		createdAt: workspace.now,
		id: workspace.id,
		readAccess: workspace.readAccess,
		title: workspace.title,
		totalSizeBytes: [...workspace.files.values()].reduce(
			(total, file) => total + file.sizeBytes,
			0
		),
		updatedAt: workspace.now,
		writeAccess: workspace.writeAccess,
	},
});

const serializeCurrentFile = (file) => ({
	content: file.content,
	contentType: file.contentType,
	path: file.path,
	updatedAt: file.updatedAt,
	updatedBy: file.updatedBy,
	version: file.version,
	workspaceId: file.workspaceId,
});

const serializeExportFile = (file) => ({
	content: file.content,
	contentType: file.contentType,
	createdAt: file.createdAt,
	path: file.path,
	updatedAt: file.updatedAt,
	updatedBy: file.updatedBy,
	version: file.version,
});

const serializeExportFileVersion = (file) => ({
	content: file.content,
	contentType: file.contentType,
	createdAt: file.createdAt,
	path: file.path,
	updatedBy: file.updatedBy,
	version: file.version,
});

const serializeExportComment = (comment) => ({
	anchor: comment.anchor,
	authorId: comment.authorId,
	body: comment.body,
	createdAt: comment.createdAt,
	path: comment.path,
	resolvedAt: comment.resolvedAt,
	resolvedBy: comment.resolvedBy,
	updatedAt: comment.updatedAt,
	version: comment.version,
});

const serializeExportEvent = (event) => ({
	actor: event.actor,
	createdAt: event.createdAt,
	path: event.path,
	payload: event.payload,
	type: event.type,
	version: event.version,
});

const serializeFileVersion = (file) => ({
	content: file.content,
	contentType: file.contentType,
	createdAt: file.updatedAt,
	path: file.path,
	sha256: file.sha256,
	sizeBytes: file.sizeBytes,
	updatedBy: file.updatedBy,
	version: file.version,
	workspaceId: file.workspaceId,
});

const buildAdminStats = (workspace) => ({
	comments: {
		total: workspace.comments.length,
		unresolved: workspace.comments.filter((comment) => !comment.resolvedAt)
			.length,
	},
	events: { total: workspace.events.length },
	files: { currentCount: workspace.files.size },
	workspace: {
		id: workspace.id,
		readAccess: workspace.readAccess,
		writeAccess: workspace.writeAccess,
	},
	workspaceId: workspace.id,
});

const retentionPayload = (workspace) => ({
	retention: {
		coverage: ["file versions", "protocol events", "comments", "admin events"],
		perWorkspaceD1: { status: "deferred" },
		status: "manual",
	},
	workspaceId: workspace.id,
});

const capabilityPayload = (workspace) => ({
	capabilities: {
		edit: {
			access: workspace.writeAccess,
			canRevoke: workspace.writeAccess !== "none",
			canRotate: workspace.writeAccess !== "none",
			tokenActive: Boolean(workspace.editToken),
		},
		read: {
			access: workspace.readAccess,
			canRevoke: Boolean(workspace.readToken),
			canRotate: true,
			tokenActive: Boolean(workspace.readToken),
		},
	},
	workspaceId: workspace.id,
});

const readLinks = (workspace) => ({
	rawUrl: `${workspace.origin}/w/${workspace.id}/raw?k=${encodeURIComponent(
		workspace.readToken ?? ""
	)}`,
	workspaceUrl: `${workspace.origin}/w/${workspace.id}?k=${encodeURIComponent(
		workspace.readToken ?? ""
	)}`,
});

const editLinks = (workspace) => ({
	editUrl: `${workspace.origin}/w/${workspace.id}?edit=${encodeURIComponent(
		workspace.editToken ?? ""
	)}`,
});

const hasReadAccess = (workspace, request, url) =>
	workspace.readAccess === "public" ||
	url.searchParams.get("k") === workspace.readToken ||
	hasEditAccess(workspace, request, url);

const hasEditAccess = (workspace, request, url) => {
	if (workspace.writeAccess === "public") {
		return true;
	}
	const bearer = request.headers.authorization?.replace(
		BEARER_PREFIX_PATTERN,
		""
	);
	return Boolean(
		workspace.editToken &&
			(bearer === workspace.editToken ||
				url.searchParams.get("edit") === workspace.editToken)
	);
};

const requireWorkspace = (workspaces, workspaceId) =>
	workspaceId ? workspaces.get(workspaceId) : null;

const readJson = async (request) => {
	const chunks = [];
	for await (const chunk of request) {
		chunks.push(chunk);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	return text.length > 0 ? JSON.parse(text) : {};
};

const sendJson = (response, body, status = 200) => {
	response.writeHead(status, { "Content-Type": "application/json" });
	response.end(JSON.stringify(body));
};

const sendText = (
	response,
	body,
	contentType = "text/markdown; charset=utf-8"
) => {
	response.writeHead(200, { "Content-Type": contentType });
	response.end(body);
};

const formatRawListing = (workspace) =>
	[
		`# ha2ha workspace: ${workspace.id}`,
		"",
		...Array.from(workspace.files.keys()).sort(),
		"",
	].join("\n");

const originFromRequest = (request) => `http://${request.headers.host}`;
