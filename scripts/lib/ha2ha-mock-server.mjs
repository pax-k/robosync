import { createServer } from "node:http";

const DEFAULT_WORKSPACE_ID = "mock-workspace";
const EDIT_TOKEN = "mock-edit-token";
const CONTENT_TYPE_MARKDOWN = "text/markdown; charset=utf-8";
const HASH_A =
	"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B =
	"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

export const createHa2haMockServer = () => {
	const state = createState();
	const server = createServer(async (request, response) => {
		try {
			await handleRequest({ request, response, state });
		} catch (error) {
			sendJson(response, 500, {
				error: "mock_server_error",
				message: error instanceof Error ? error.message : String(error),
			});
		}
	});

	return {
		close: () =>
			new Promise((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}),
		start: () =>
			new Promise((resolve) => {
				server.listen(0, "127.0.0.1", () => {
					const address = server.address();
					if (!address || typeof address === "string") {
						throw new Error("Expected a TCP server address.");
					}
					resolve({
						baseUrl: `http://127.0.0.1:${address.port}`,
						editToken: EDIT_TOKEN,
						workspaceId: state.workspaceId,
					});
				});
			}),
	};
};

const createState = () => ({
	events: [],
	files: new Map(),
	fileVersions: new Map(),
	workspaceId: DEFAULT_WORKSPACE_ID,
});

const handleRequest = async ({ request, response, state }) => {
	const url = new URL(request.url ?? "/", "http://127.0.0.1");
	const method = request.method ?? "GET";
	const workspacePrefix = `/api/workspaces/${state.workspaceId}`;
	const context = { method, request, response, state, url, workspacePrefix };

	if (await dispatchRoute(context, routeHandlers)) {
		return;
	}

	sendJson(response, 404, { error: "not_found" });
};

const dispatchRoute = async (context, [handler, ...remainingHandlers]) => {
	if (!handler) {
		return false;
	}
	return (await handler(context)) || dispatchRoute(context, remainingHandlers);
};

const routeHandlers = [
	async (context) => handleWorkspaceCreate(context),
	(context) => handleRawListing(context),
	(context) => handleRawEvents(context),
	(context) => handleRawFile(context),
	(context) => handleTree(context),
	(context) => handleEvents(context),
	(context) => handleFileVersionsList(context),
	(context) => handleFileVersionRead(context),
	(context) => handleFileRead(context),
	async (context) => handleFileWrite(context),
	async (context) => handleFileDelete(context),
];

const handleWorkspaceCreate = async ({
	method,
	request,
	response,
	state,
	url,
}) => {
	if (method !== "POST" || url.pathname !== "/api/workspaces") {
		return false;
	}
	const body = await readJsonBody(request);
	state.files.clear();
	state.fileVersions.clear();
	state.events.length = 0;
	for (const file of Array.isArray(body.files) ? body.files : []) {
		if (!isRecord(file)) {
			continue;
		}
		putInitialFile({
			content: String(file.content),
			filePath: String(file.path),
			state,
		});
	}
	sendJson(response, 201, {
		editUrl: `http://mock.local/w/${state.workspaceId}?edit=${EDIT_TOKEN}`,
		id: state.workspaceId,
		rawUrl: `http://mock.local/w/${state.workspaceId}/raw?k=mock-read-token`,
		workspaceUrl: `http://mock.local/w/${state.workspaceId}`,
	});
	return true;
};

const handleRawListing = ({ method, response, state, url }) => {
	if (method !== "GET" || url.pathname !== `/w/${state.workspaceId}/raw`) {
		return false;
	}
	sendText(response, 200, [...state.files.keys()].sort().join("\n"), {
		"Content-Type": "text/plain; charset=utf-8",
	});
	return true;
};

const handleRawEvents = ({ method, response, state, url }) => {
	if (
		method !== "GET" ||
		url.pathname !== `/w/${state.workspaceId}/raw/events`
	) {
		return false;
	}
	sendJson(response, 200, {
		events: state.events,
		workspaceId: state.workspaceId,
	});
	return true;
};

const handleRawFile = ({ method, response, state, url }) => {
	const rawPrefix = `/w/${state.workspaceId}/raw/`;
	if (method !== "GET" || !url.pathname.startsWith(rawPrefix)) {
		return false;
	}
	const filePath = decodeURIComponent(url.pathname.slice(rawPrefix.length));
	const file = state.files.get(filePath);
	if (!file) {
		sendJson(response, 404, { error: "not_found" });
		return true;
	}
	sendText(response, 200, file.content, {
		"Content-Type": file.contentType,
		ETag: `"${file.version}"`,
		"X-HA2HA-File-Version": String(file.version),
		"X-HA2HA-Path": filePath,
	});
	return true;
};

const handleTree = ({ method, response, state, url, workspacePrefix }) => {
	if (method !== "GET" || url.pathname !== `${workspacePrefix}/tree`) {
		return false;
	}
	sendJson(response, 200, {
		files: [...state.files.entries()].map(([path, file]) => ({
			path,
			version: file.version,
		})),
		workspaceId: state.workspaceId,
	});
	return true;
};

const handleEvents = ({ method, response, state, url, workspacePrefix }) => {
	if (method !== "GET" || url.pathname !== `${workspacePrefix}/events`) {
		return false;
	}
	sendJson(response, 200, {
		events: state.events,
		workspaceId: state.workspaceId,
	});
	return true;
};

const handleFileVersionsList = ({
	method,
	response,
	state,
	url,
	workspacePrefix,
}) => {
	if (
		method !== "GET" ||
		url.pathname !== `${workspacePrefix}/files/versions`
	) {
		return false;
	}
	const filePath = String(url.searchParams.get("path") ?? "");
	sendJson(response, 200, {
		path: filePath,
		versions: (state.fileVersions.get(filePath) ?? []).map(
			serializeFileVersion
		),
		workspaceId: state.workspaceId,
	});
	return true;
};

const handleFileVersionRead = ({
	method,
	response,
	state,
	url,
	workspacePrefix,
}) => {
	const versionPrefix = `${workspacePrefix}/files/versions/`;
	if (method !== "GET" || !url.pathname.startsWith(versionPrefix)) {
		return false;
	}
	const filePath = String(url.searchParams.get("path") ?? "");
	const version = Number(url.pathname.slice(versionPrefix.length));
	const fileVersion = (state.fileVersions.get(filePath) ?? []).find(
		(candidate) => candidate.version === version
	);
	if (!fileVersion) {
		sendJson(response, 404, { error: "not_found" });
		return true;
	}
	sendJson(response, 200, {
		...serializeFileVersion(fileVersion),
		content: fileVersion.content,
	});
	return true;
};

const handleFileRead = ({ method, response, state, url, workspacePrefix }) => {
	if (method !== "GET" || url.pathname !== `${workspacePrefix}/files`) {
		return false;
	}
	const filePath = String(url.searchParams.get("path") ?? "");
	const file = state.files.get(filePath);
	if (!file) {
		sendJson(response, 404, { error: "not_found" });
		return true;
	}
	sendJson(response, 200, {
		content: file.content,
		contentType: file.contentType,
		path: filePath,
		updatedBy: file.updatedBy,
		version: file.version,
		workspaceId: state.workspaceId,
	});
	return true;
};

const handleFileWrite = async ({
	method,
	request,
	response,
	state,
	url,
	workspacePrefix,
}) => {
	if (method !== "PUT" || url.pathname !== `${workspacePrefix}/files`) {
		return false;
	}
	const body = await readJsonBody(request);
	if (!body.actor) {
		sendJson(response, 400, { error: "invalid_request" });
		return true;
	}
	const filePath = String(body.path);
	const current = state.files.get(filePath);
	if (current && body.baseVersion !== current.version) {
		sendVersionConflict({ current, filePath, response, state });
		return true;
	}
	writeStateFile({ body, current, filePath, response, state });
	return true;
};

const handleFileDelete = async ({
	method,
	request,
	response,
	state,
	url,
	workspacePrefix,
}) => {
	if (method !== "DELETE" || url.pathname !== `${workspacePrefix}/files`) {
		return false;
	}
	const body = await readJsonBody(request);
	const filePath = String(url.searchParams.get("path") ?? "");
	const current = state.files.get(filePath);
	if (!(body.actor && body.baseVersion)) {
		sendJson(response, 400, { error: "invalid_request" });
		return true;
	}
	if (!current) {
		sendJson(response, 404, { error: "not_found" });
		return true;
	}
	if (body.baseVersion !== current.version) {
		sendVersionConflict({ current, filePath, response, state });
		return true;
	}
	state.files.delete(filePath);
	pushEvent(state, {
		actor: String(body.actor),
		path: filePath,
		payload: { baseVersion: body.baseVersion },
		type: "file.deleted",
		version: current.version,
	});
	sendJson(response, 200, {
		deleted: true,
		deletedBy: String(body.actor),
		path: filePath,
		workspaceId: state.workspaceId,
	});
	return true;
};

const sendVersionConflict = ({ current, filePath, response, state }) => {
	sendJson(response, 409, {
		error: "version_conflict",
		latest: {
			content: current.content,
			contentType: current.contentType,
			path: filePath,
			updatedAt: "2026-07-08T00:00:00.000Z",
			updatedBy: current.updatedBy,
			version: current.version,
			workspaceId: state.workspaceId,
		},
		message: "File changed since baseVersion.",
	});
};

const writeStateFile = ({ body, current, filePath, response, state }) => {
	const nextVersion = current ? current.version + 1 : 1;
	const content = String(body.content);
	const file = {
		content,
		contentType: String(body.contentType ?? CONTENT_TYPE_MARKDOWN),
		updatedBy: String(body.actor),
		version: nextVersion,
	};
	state.files.set(filePath, file);
	pushVersion(state, {
		...file,
		createdAt: "2026-07-08T00:00:00.000Z",
		path: filePath,
		sha256: HASH_B,
		sizeBytes: content.length,
		workspaceId: state.workspaceId,
	});
	pushEvent(state, {
		actor: String(body.actor),
		path: filePath,
		payload: { baseVersion: body.baseVersion ?? null },
		type: current ? "file.updated" : "file.created",
		version: nextVersion,
	});
	sendJson(response, 200, {
		path: filePath,
		updatedBy: String(body.actor),
		version: nextVersion,
		workspaceId: state.workspaceId,
	});
};

const putInitialFile = ({ content, filePath, state }) => {
	const file = {
		content,
		contentType: CONTENT_TYPE_MARKDOWN,
		updatedBy: "workspace-create",
		version: 1,
	};
	state.files.set(filePath, file);
	pushVersion(state, {
		...file,
		createdAt: "2026-07-08T00:00:00.000Z",
		path: filePath,
		sha256: HASH_A,
		sizeBytes: content.length,
		workspaceId: state.workspaceId,
	});
	pushEvent(state, {
		actor: "workspace-create",
		path: filePath,
		payload: {},
		type: "file.created",
		version: 1,
	});
};

const pushEvent = (state, { actor, path, payload, type, version }) => {
	state.events.push({
		actor,
		createdAt: "2026-07-08T00:00:00.000Z",
		id: `evt-${state.events.length + 1}`,
		path,
		payload,
		type,
		version,
		workspaceId: state.workspaceId,
	});
};

const pushVersion = (state, fileVersion) => {
	const versions = state.fileVersions.get(fileVersion.path) ?? [];
	versions.push(fileVersion);
	state.fileVersions.set(fileVersion.path, versions);
};

const serializeFileVersion = (fileVersion) => ({
	contentType: fileVersion.contentType,
	createdAt: fileVersion.createdAt,
	path: fileVersion.path,
	sha256: fileVersion.sha256,
	sizeBytes: fileVersion.sizeBytes,
	updatedBy: fileVersion.updatedBy,
	version: fileVersion.version,
	workspaceId: fileVersion.workspaceId,
});

const readJsonBody = async (request) => {
	const chunks = [];
	for await (const chunk of request) {
		chunks.push(chunk);
	}
	if (chunks.length === 0) {
		return {};
	}
	const text = Buffer.concat(chunks).toString("utf8");
	const value = JSON.parse(text);
	return isRecord(value) ? value : {};
};

const sendJson = (response, status, body) => {
	const payload = JSON.stringify(body);
	response.writeHead(status, {
		"Content-Length": Buffer.byteLength(payload),
		"Content-Type": "application/json",
	});
	response.end(payload);
};

const sendText = (response, status, body, headers) => {
	response.writeHead(status, {
		"Content-Length": Buffer.byteLength(body),
		...headers,
	});
	response.end(body);
};

const isRecord = (value) =>
	typeof value === "object" && value !== null && !Array.isArray(value);
