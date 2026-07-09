import assert from "node:assert/strict";
import { test } from "node:test";

import { runHa2haHttpConformance } from "./conformance";

interface MockFile {
	content: string;
	contentType: string;
	updatedBy: string | null;
	version: number;
}

interface MockEvent {
	actor: string | null;
	createdAt: string;
	id: string;
	path: string;
	payload: Record<string, unknown>;
	type: string;
	version: number;
	workspaceId: string;
}

interface MockFileVersion extends MockFile {
	createdAt: string;
	path: string;
	sha256: string;
	sizeBytes: number;
	workspaceId: string;
}

interface MockFetchOptions {
	disableEventsRoute?: boolean;
	disableFileHistoryRoute?: boolean;
	failCreate?: boolean;
	invalidConflictResponse?: boolean;
	omitRawFileHeaders?: boolean;
	onCreateBody?: (body: Record<string, unknown>) => void;
}

const createMockFetch = (options: MockFetchOptions = {}): typeof fetch => {
	const events: MockEvent[] = [];
	const files = new Map<string, MockFile>();
	const fileVersions = new Map<string, MockFileVersion[]>();
	let workspaceId = "mock-workspace";
	const editToken = "mock-edit-token";

	return (input, init) => {
		const url = new URL(String(input));
		const method = init?.method ?? "GET";

		if (method === "POST" && url.pathname === "/api/workspaces") {
			if (options.failCreate) {
				return respond(jsonResponse({ error: "create_failed" }, 500));
			}
			const body = parseBody(init);
			options.onCreateBody?.(body);
			workspaceId = "mock-workspace";
			const inputFiles = Array.isArray(body.files) ? body.files : [];
			const actor =
				typeof body.actor === "string" ? body.actor : "workspace-create";
			for (const file of inputFiles) {
				if (isRecord(file)) {
					const filePath = String(file.path);
					const content = String(file.content);
					files.set(String(file.path), {
						content,
						contentType: "text/markdown; charset=utf-8",
						updatedBy: actor,
						version: 1,
					});
					pushVersion(fileVersions, {
						content,
						contentType: "text/markdown; charset=utf-8",
						createdAt: "2026-07-08T00:00:00Z",
						path: filePath,
						sha256:
							"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
						sizeBytes: content.length,
						updatedBy: actor,
						version: 1,
						workspaceId,
					});
					events.push({
						actor,
						createdAt: "2026-07-08T00:00:00Z",
						id: `evt-${events.length + 1}`,
						path: filePath,
						payload: {},
						type: "file.created",
						version: 1,
						workspaceId,
					});
				}
			}
			return respond(
				jsonResponse(
					{
						editUrl: `http://mock.local/w/${workspaceId}?edit=${editToken}`,
						id: workspaceId,
						rawUrl: `http://mock.local/w/${workspaceId}/raw?k=mock-read-token`,
					},
					201
				)
			);
		}

		if (method === "GET" && url.pathname === `/w/${workspaceId}/raw`) {
			return respond(
				textResponse([...files.keys()].sort().join("\n"), 200, {
					"Content-Type": "text/plain; charset=utf-8",
				})
			);
		}

		if (method === "GET" && url.pathname === `/w/${workspaceId}/raw/events`) {
			if (options.disableEventsRoute) {
				return respond(jsonResponse({ error: "not_found" }, 404));
			}
			return respond(jsonResponse({ events, workspaceId }));
		}

		if (method === "GET" && url.pathname.startsWith(`/w/${workspaceId}/raw/`)) {
			const filePath = decodeURIComponent(
				url.pathname.slice(`/w/${workspaceId}/raw/`.length)
			);
			const file = requireFile(files, filePath);
			const headers: Record<string, string> = {
				"Content-Type": file.contentType,
			};
			if (!options.omitRawFileHeaders) {
				headers.ETag = `"${file.version}"`;
				headers["X-HA2HA-File-Version"] = String(file.version);
				headers["X-HA2HA-Path"] = filePath;
			}
			return respond(textResponse(file.content, 200, headers));
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${workspaceId}/tree`
		) {
			return respond(
				jsonResponse({
					files: [...files.entries()].map(([path, file]) => ({
						path,
						version: file.version,
					})),
					workspaceId,
				})
			);
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${workspaceId}/events`
		) {
			if (options.disableEventsRoute) {
				return respond(jsonResponse({ error: "not_found" }, 404));
			}
			return respond(jsonResponse({ events, workspaceId }));
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${workspaceId}/files/versions`
		) {
			if (options.disableFileHistoryRoute) {
				return respond(jsonResponse({ error: "not_found" }, 404));
			}
			const filePath = String(url.searchParams.get("path"));
			return respond(
				jsonResponse({
					path: filePath,
					versions: (fileVersions.get(filePath) ?? []).map(
						serializeMockVersion
					),
					workspaceId,
				})
			);
		}

		if (
			method === "GET" &&
			url.pathname.startsWith(`/api/workspaces/${workspaceId}/files/versions/`)
		) {
			if (options.disableFileHistoryRoute) {
				return respond(jsonResponse({ error: "not_found" }, 404));
			}
			const filePath = String(url.searchParams.get("path"));
			const version = Number(
				url.pathname.slice(
					`/api/workspaces/${workspaceId}/files/versions/`.length
				)
			);
			const fileVersion = (fileVersions.get(filePath) ?? []).find(
				(candidate) => candidate.version === version
			);
			if (!fileVersion) {
				return respond(jsonResponse({ error: "not_found" }, 404));
			}
			return respond(
				jsonResponse({
					...serializeMockVersion(fileVersion),
					content: fileVersion.content,
				})
			);
		}

		if (
			method === "GET" &&
			url.pathname === `/api/workspaces/${workspaceId}/files`
		) {
			const filePath = String(url.searchParams.get("path"));
			const file = requireFile(files, filePath);
			return respond(
				jsonResponse({
					content: file.content,
					path: filePath,
					updatedBy: file.updatedBy,
					version: file.version,
					workspaceId,
				})
			);
		}

		if (
			method === "PUT" &&
			url.pathname === `/api/workspaces/${workspaceId}/files`
		) {
			const body = parseBody(init);
			if (!body.actor) {
				return respond(jsonResponse({ error: "invalid_request" }, 400));
			}
			const filePath = String(body.path);
			const current = files.get(filePath);
			if (current && body.baseVersion !== current.version) {
				if (options.invalidConflictResponse) {
					return respond(
						jsonResponse(
							{
								error: "version_conflict",
								latest: {
									path: filePath,
								},
								message: "File changed since baseVersion.",
							},
							409
						)
					);
				}
				return respond(
					jsonResponse(
						{
							error: "version_conflict",
							latest: {
								content: current.content,
								contentType: current.contentType,
								path: filePath,
								updatedAt: "2026-07-08T00:00:00Z",
								updatedBy: current.updatedBy,
								version: current.version,
								workspaceId,
							},
							message: "File changed since baseVersion.",
						},
						409
					)
				);
			}
			const nextVersion = current ? current.version + 1 : 1;
			const content = String(body.content);
			files.set(filePath, {
				content,
				contentType: "text/markdown; charset=utf-8",
				updatedBy: String(body.actor),
				version: nextVersion,
			});
			pushVersion(fileVersions, {
				content,
				contentType: "text/markdown; charset=utf-8",
				createdAt: "2026-07-08T00:00:00Z",
				path: filePath,
				sha256:
					"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				sizeBytes: content.length,
				updatedBy: String(body.actor),
				version: nextVersion,
				workspaceId,
			});
			events.push({
				actor: String(body.actor),
				createdAt: "2026-07-08T00:00:00Z",
				id: `evt-${events.length + 1}`,
				path: filePath,
				payload: { baseVersion: body.baseVersion ?? null },
				type: current ? "file.updated" : "file.created",
				version: nextVersion,
				workspaceId,
			});
			return respond(
				jsonResponse({
					path: filePath,
					updatedBy: String(body.actor),
					version: nextVersion,
					workspaceId,
				})
			);
		}

		if (
			method === "DELETE" &&
			url.pathname === `/api/workspaces/${workspaceId}/files`
		) {
			const body = parseBody(init);
			if (!(body.actor && body.baseVersion)) {
				return respond(jsonResponse({ error: "invalid_request" }, 400));
			}
			const filePath = String(url.searchParams.get("path"));
			const current = requireFile(files, filePath);
			if (body.baseVersion !== current.version) {
				return respond(jsonResponse({ error: "version_conflict" }, 409));
			}
			files.delete(filePath);
			events.push({
				actor: String(body.actor),
				createdAt: "2026-07-08T00:00:00Z",
				id: `evt-${events.length + 1}`,
				path: filePath,
				payload: { baseVersion: body.baseVersion },
				type: "file.deleted",
				version: current.version,
				workspaceId,
			});
			return respond(
				jsonResponse({
					deleted: true,
					deletedBy: String(body.actor),
					path: filePath,
					workspaceId,
				})
			);
		}

		return respond(jsonResponse({ error: "not_found" }, 404));
	};
};

test("HTTP conformance passes against a conforming mock implementation", async () => {
	const result = await runHa2haHttpConformance({
		baseUrl: "http://mock.local",
		fetch: createMockFetch(),
	});

	assert.equal(result.ok, true, JSON.stringify(result.checks, null, 2));
	assert.equal(
		result.checks.some((check) => check.id === "file.update.conflict"),
		true
	);
});

test("HTTP conformance sends actor on workspace create", async () => {
	let createActor: unknown;
	const result = await runHa2haHttpConformance({
		actor: "agent-create",
		baseUrl: "http://mock.local",
		fetch: createMockFetch({
			onCreateBody: (body) => {
				createActor = body.actor;
			},
		}),
	});

	assert.equal(result.ok, true, JSON.stringify(result.checks, null, 2));
	assert.equal(createActor, "agent-create");
});

test("HTTP conformance records a failed create and stops dependent checks", async () => {
	const result = await runHa2haHttpConformance({
		baseUrl: "http://mock.local",
		fetch: createMockFetch({ failCreate: true }),
	});

	assert.equal(result.ok, false);
	assert.deepEqual(
		result.checks.map((check) => check.id),
		["workspace.create"]
	);
	assert.equal(getCheck(result, "workspace.create").ok, false);
});

test("HTTP conformance fails when raw file headers are missing", async () => {
	const result = await runHa2haHttpConformance({
		baseUrl: "http://mock.local",
		fetch: createMockFetch({ omitRawFileHeaders: true }),
	});

	assert.equal(result.ok, false);
	assert.equal(getCheck(result, "raw.file.headers").ok, false);
});

test("HTTP conformance fails invalid conflict response shapes", async () => {
	const result = await runHa2haHttpConformance({
		baseUrl: "http://mock.local",
		fetch: createMockFetch({ invalidConflictResponse: true }),
	});

	assert.equal(result.ok, false);
	assert.equal(getCheck(result, "file.update.conflict").ok, false);
});

test("HTTP conformance reports missing event profile routes", async () => {
	const result = await runHa2haHttpConformance({
		baseUrl: "http://mock.local",
		fetch: createMockFetch({ disableEventsRoute: true }),
	});

	assert.equal(result.ok, false);
	assert.equal(getCheck(result, "workspace.create").ok, true);
	assert.equal(getCheck(result, "events.read").ok, false);
	assert.equal(getCheck(result, "events.raw-read").ok, false);
});

test("HTTP conformance reports missing file-history profile routes", async () => {
	const result = await runHa2haHttpConformance({
		baseUrl: "http://mock.local",
		fetch: createMockFetch({ disableFileHistoryRoute: true }),
	});

	assert.equal(result.ok, false);
	assert.equal(getCheck(result, "workspace.create").ok, true);
	assert.equal(getCheck(result, "file-history.list").ok, false);
	assert.equal(getCheck(result, "file-history.read").ok, false);
});

const parseBody = (init?: RequestInit): Record<string, unknown> => {
	if (typeof init?.body !== "string") {
		return {};
	}
	const value: unknown = JSON.parse(init.body);
	return isRecord(value) ? value : {};
};

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" },
		status,
	});

const textResponse = (
	body: string,
	status: number,
	headers: Record<string, string>
) => new Response(body, { headers, status });

const respond = (response: Response): Promise<Response> =>
	Promise.resolve(response);

const serializeMockVersion = (fileVersion: MockFileVersion) => ({
	contentType: fileVersion.contentType,
	createdAt: fileVersion.createdAt,
	path: fileVersion.path,
	sha256: fileVersion.sha256,
	sizeBytes: fileVersion.sizeBytes,
	updatedBy: fileVersion.updatedBy,
	version: fileVersion.version,
	workspaceId: fileVersion.workspaceId,
});

const pushVersion = (
	fileVersions: Map<string, MockFileVersion[]>,
	fileVersion: MockFileVersion
) => {
	const versions = fileVersions.get(fileVersion.path) ?? [];
	versions.push(fileVersion);
	fileVersions.set(fileVersion.path, versions);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const requireFile = (
	files: Map<string, MockFile>,
	filePath: string
): MockFile => {
	const file = files.get(filePath);
	if (!file) {
		throw new Error(`Missing mock file ${filePath}.`);
	}
	return file;
};

const getCheck = (
	result: Awaited<ReturnType<typeof runHa2haHttpConformance>>,
	id: string
) => {
	const check = result.checks.find((candidate) => candidate.id === id);
	assert.ok(check, `Missing check ${id}`);
	return check;
};
