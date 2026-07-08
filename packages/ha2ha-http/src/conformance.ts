import { HA2HA_CONFLICT, HA2HA_HEADERS, HA2HA_PATHS } from "@ha2ha/protocol";
import { ha2haConflictResponseSchema } from "@ha2ha/protocol/schemas";

const CONFORMANCE_ACTOR = "ha2ha-conformance";
const JSON_INDENT_SPACES = 2;
const TRAILING_SLASH_PATTERN = /\/$/u;

export type Ha2haConformanceProfile =
	| "core-workspace"
	| "event-profile"
	| "file-history-profile"
	| "http-profile"
	| "workspace-convention";

export interface Ha2haConformanceCheck {
	expected?: unknown;
	id: string;
	message: string;
	observed?: unknown;
	ok: boolean;
	profile: Ha2haConformanceProfile;
	status?: number;
}

export interface Ha2haConformanceResult {
	checks: Ha2haConformanceCheck[];
	implementation: string;
	ok: boolean;
	profiles: Ha2haConformanceProfile[];
	target: string;
	timestamp: string;
}

export interface RunHa2haHttpConformanceOptions {
	actor?: string;
	baseUrl: string;
	fetch?: typeof fetch;
	implementation?: string;
}

interface WorkspaceContext {
	editToken: string;
	workspaceId: string;
}

export const runHa2haHttpConformance = async ({
	actor = CONFORMANCE_ACTOR,
	baseUrl,
	fetch: fetchImpl = fetch,
	implementation = "mdsync",
}: RunHa2haHttpConformanceOptions): Promise<Ha2haConformanceResult> => {
	const target = normalizeBaseUrl(baseUrl);
	const checks: Ha2haConformanceCheck[] = [];
	const profiles: Ha2haConformanceProfile[] = [
		"core-workspace",
		"workspace-convention",
		"http-profile",
		"event-profile",
		"file-history-profile",
	];

	const context = await recordCheck(checks, {
		id: "workspace.create",
		profile: "core-workspace",
		run: () => createWorkspace({ actor, fetchImpl, target }),
	});

	if (!context) {
		return buildResult({ checks, implementation, profiles, target });
	}

	const statusFile = await recordCheck(checks, {
		id: "file.read-json",
		profile: "core-workspace",
		run: () =>
			readJsonFile({ context, fetchImpl, path: HA2HA_PATHS.status, target }),
	});

	await recordCheck(checks, {
		id: "raw.listing",
		profile: "core-workspace",
		run: () => checkRawListing({ context, fetchImpl, target }),
	});
	await recordCheck(checks, {
		id: "raw.file.headers",
		profile: "http-profile",
		run: () => checkRawFileHeaders({ context, fetchImpl, target }),
	});
	await recordCheck(checks, {
		id: "tree.read",
		profile: "http-profile",
		run: () => checkTree({ context, fetchImpl, target }),
	});
	await recordCheck(checks, {
		id: "file.update.requires-actor",
		profile: "http-profile",
		run: () => checkUpdateRequiresActor({ context, fetchImpl, target }),
	});

	const updatedStatus = await recordCheck(checks, {
		id: "file.update.actor-base-version",
		profile: "http-profile",
		run: () =>
			updateStatusFile({
				actor,
				baseVersion: getVersion(statusFile),
				context,
				fetchImpl,
				target,
			}),
	});

	await recordCheck(checks, {
		id: "file.update.conflict",
		profile: "http-profile",
		run: () =>
			checkStaleUpdateConflict({
				actor,
				baseVersion: getVersion(statusFile),
				context,
				fetchImpl,
				target,
			}),
	});

	const createdFile = await recordCheck(checks, {
		id: "file.create.actor",
		profile: "core-workspace",
		run: () => createEvidenceFile({ actor, context, fetchImpl, target }),
	});

	await recordCheck(checks, {
		id: "file.delete.requires-actor",
		profile: "http-profile",
		run: () =>
			checkDeleteRequiresActor({
				baseVersion: getVersion(createdFile),
				context,
				fetchImpl,
				target,
			}),
	});
	await recordCheck(checks, {
		id: "file.delete.requires-base-version",
		profile: "http-profile",
		run: () =>
			checkDeleteRequiresBaseVersion({ actor, context, fetchImpl, target }),
	});
	await recordCheck(checks, {
		id: "file.delete.actor-base-version",
		profile: "http-profile",
		run: () =>
			deleteEvidenceFile({
				actor,
				baseVersion: getVersion(createdFile),
				context,
				fetchImpl,
				target,
			}),
	});

	await recordCheck(checks, {
		id: "file.read-updated-target",
		profile: "core-workspace",
		run: () =>
			assertVersionedTarget({
				file: updatedStatus,
				path: HA2HA_PATHS.status,
				workspaceId: context.workspaceId,
			}),
	});
	await recordCheck(checks, {
		id: "events.read",
		profile: "event-profile",
		run: () =>
			checkEvents({
				actor,
				context,
				fetchImpl,
				target,
				updatedVersion: getVersion(updatedStatus),
			}),
	});
	await recordCheck(checks, {
		id: "events.raw-read",
		profile: "event-profile",
		run: () => checkRawEvents({ context, fetchImpl, target }),
	});
	await recordCheck(checks, {
		id: "file-history.list",
		profile: "file-history-profile",
		run: () =>
			checkFileHistoryList({
				actor,
				context,
				fetchImpl,
				target,
				updatedVersion: getVersion(updatedStatus),
			}),
	});
	await recordCheck(checks, {
		id: "file-history.read",
		profile: "file-history-profile",
		run: () => checkHistoricalFileRead({ context, fetchImpl, target }),
	});

	return buildResult({ checks, implementation, profiles, target });
};

export const formatConformanceResult = (
	result: Ha2haConformanceResult
): string => JSON.stringify(result, null, JSON_INDENT_SPACES);

const createWorkspace = async ({
	fetchImpl,
	target,
}: {
	actor: string;
	fetchImpl: typeof fetch;
	target: string;
}): Promise<WorkspaceContext> => {
	const response = await fetchImpl(`${target}/api/workspaces`, {
		body: JSON.stringify({
			files: [
				{
					content: "# HA2HA HTTP Conformance\n",
					path: HA2HA_PATHS.manifestMarkdown,
				},
				{
					content: "# Status\n\n- HTTP conformance setup.\n",
					path: HA2HA_PATHS.status,
				},
				{
					content:
						"---\nid: RS-HTTP-001\ntitle: HTTP conformance\nstate: ready\nowner: null\nupdated_by: ha2ha-conformance\nevidence: []\n---\n\n## Goal\n\nExercise the HTTP profile.\n",
					path: "tasks/RS-HTTP-001.md",
				},
			],
			readAccess: "token",
			title: "HA2HA HTTP Conformance",
			writeAccess: "token",
		}),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	const body = await readJson(response);
	const workspaceId = requireString(
		getString(body, "id"),
		"create response id"
	);
	const editUrl = getString(body, "editUrl");
	const editToken = editUrl ? new URL(editUrl).searchParams.get("edit") : null;

	assertStatus(response, 201);

	return {
		editToken: requireString(editToken, "create response edit token"),
		workspaceId,
	};
};

const checkRawListing = async ({
	context,
	fetchImpl,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/w/${context.workspaceId}/raw?edit=${context.editToken}`
	);
	const body = await response.text();
	assertStatus(response, 200);
	assertHeaderIncludes(response, "Content-Type", "text/plain");
	assertIncludes(body, HA2HA_PATHS.manifestMarkdown);
	assertIncludes(body, HA2HA_PATHS.status);
	assertIncludes(body, "tasks/RS-HTTP-001.md");
	return { body };
};

const checkRawFileHeaders = async ({
	context,
	fetchImpl,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/w/${context.workspaceId}/raw/${encodePath(HA2HA_PATHS.status)}?edit=${context.editToken}`
	);
	const body = await response.text();
	assertStatus(response, 200);
	assertHeaderEquals(response, HA2HA_HEADERS.fileVersion, "1");
	assertHeaderEquals(response, HA2HA_HEADERS.path, HA2HA_PATHS.status);
	assertHeaderEquals(response, "ETag", '"1"');
	assertIncludes(body, "# Status");
	return { body };
};

const checkTree = async ({
	context,
	fetchImpl,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/tree?edit=${context.editToken}`
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	const files = getArray(body, "files");
	const paths = files.map((file) => getString(file, "path")).filter(Boolean);
	assertIncludes(paths.join("\n"), HA2HA_PATHS.status);
	return { fileCount: files.length };
};

const readJsonFile = async ({
	context,
	fetchImpl,
	path: filePath,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	path: string;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files?path=${encodeURIComponent(filePath)}&edit=${context.editToken}`
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	assertEquals(getString(body, "workspaceId"), context.workspaceId);
	assertEquals(getString(body, "path"), filePath);
	return body;
};

const checkUpdateRequiresActor = async ({
	context,
	fetchImpl,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files`,
		{
			body: JSON.stringify({
				baseVersion: 1,
				content: "# Status\n\n- Missing actor.\n",
				path: HA2HA_PATHS.status,
			}),
			headers: authHeaders(context.editToken),
			method: "PUT",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 400);
	return body;
};

const updateStatusFile = async ({
	actor,
	baseVersion,
	context,
	fetchImpl,
	target,
}: {
	actor: string;
	baseVersion: number;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files`,
		{
			body: JSON.stringify({
				actor,
				baseVersion,
				content: "# Status\n\n- HTTP conformance updated.\n",
				path: HA2HA_PATHS.status,
			}),
			headers: authHeaders(context.editToken),
			method: "PUT",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	assertEquals(getNumber(body, "version"), baseVersion + 1);
	assertEquals(getString(body, "updatedBy"), actor);
	return body;
};

const checkStaleUpdateConflict = async ({
	actor,
	baseVersion,
	context,
	fetchImpl,
	target,
}: {
	actor: string;
	baseVersion: number;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files`,
		{
			body: JSON.stringify({
				actor,
				baseVersion,
				content: "# Status\n\n- Stale update.\n",
				path: HA2HA_PATHS.status,
			}),
			headers: authHeaders(context.editToken),
			method: "PUT",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 409);
	const parsed = ha2haConflictResponseSchema.safeParse(body);
	if (!parsed.success) {
		throw new Error("Conflict response does not match HA2HA schema.");
	}
	assertEquals(parsed.data.error, HA2HA_CONFLICT.error);
	assertEquals(parsed.data.latest.workspaceId, context.workspaceId);
	assertEquals(parsed.data.latest.path, HA2HA_PATHS.status);
	return body;
};

const createEvidenceFile = async ({
	actor,
	context,
	fetchImpl,
	target,
}: {
	actor: string;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const path = "evidence/RS-HTTP-001/conformance.md";
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files`,
		{
			body: JSON.stringify({
				actor,
				content:
					"---\nid: ev-RS-HTTP-001-conformance\ntask: RS-HTTP-001\nkind: conformance\nresult: pass\nactor: ha2ha-conformance\ncreated_at: 2026-07-08T00:00:00Z\n---\n\nHTTP conformance evidence.\n",
				path,
			}),
			headers: authHeaders(context.editToken),
			method: "PUT",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	assertEquals(getString(body, "path"), path);
	assertEquals(getNumber(body, "version"), 1);
	return body;
};

const checkDeleteRequiresActor = async ({
	baseVersion,
	context,
	fetchImpl,
	target,
}: {
	baseVersion: number;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files?path=${encodeURIComponent("evidence/RS-HTTP-001/conformance.md")}`,
		{
			body: JSON.stringify({ baseVersion }),
			headers: authHeaders(context.editToken),
			method: "DELETE",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 400);
	return body;
};

const checkDeleteRequiresBaseVersion = async ({
	actor,
	context,
	fetchImpl,
	target,
}: {
	actor: string;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files?path=${encodeURIComponent("evidence/RS-HTTP-001/conformance.md")}`,
		{
			body: JSON.stringify({ actor }),
			headers: authHeaders(context.editToken),
			method: "DELETE",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 400);
	return body;
};

const deleteEvidenceFile = async ({
	actor,
	baseVersion,
	context,
	fetchImpl,
	target,
}: {
	actor: string;
	baseVersion: number;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const filePath = "evidence/RS-HTTP-001/conformance.md";
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files?path=${encodeURIComponent(filePath)}`,
		{
			body: JSON.stringify({ actor, baseVersion }),
			headers: authHeaders(context.editToken),
			method: "DELETE",
		}
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	assertEquals(getString(body, "deletedBy"), actor);
	assertEquals(getString(body, "path"), filePath);
	return body;
};

const assertVersionedTarget = ({
	file,
	path: filePath,
	workspaceId,
}: {
	file: unknown;
	path: string;
	workspaceId: string;
}) => {
	assertEquals(getString(file, "workspaceId"), workspaceId);
	assertEquals(getString(file, "path"), filePath);
	assertPositiveNumber(getNumber(file, "version"), "file version");
	return file;
};

const checkEvents = async ({
	actor,
	context,
	fetchImpl,
	target,
	updatedVersion,
}: {
	actor: string;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
	updatedVersion: number;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/events?edit=${context.editToken}`
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	const events = getArray(body, "events");
	const updateEvent = findRecord(events, "type", "file.updated");
	assertEquals(getString(updateEvent, "actor"), actor);
	assertEquals(getString(updateEvent, "path"), HA2HA_PATHS.status);
	assertEquals(getNumber(updateEvent, "version"), updatedVersion);
	assertEquals(getString(updateEvent, "workspaceId"), context.workspaceId);
	return body;
};

const checkRawEvents = async ({
	context,
	fetchImpl,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/w/${context.workspaceId}/raw/events?edit=${context.editToken}`
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	const events = getArray(body, "events");
	if (events.length === 0) {
		throw new Error("Expected raw events feed to include events.");
	}
	return body;
};

const checkFileHistoryList = async ({
	actor,
	context,
	fetchImpl,
	target,
	updatedVersion,
}: {
	actor: string;
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
	updatedVersion: number;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files/versions?path=${encodeURIComponent(HA2HA_PATHS.status)}&edit=${context.editToken}`
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	const versions = getArray(body, "versions");
	const initialVersion = findRecord(versions, "version", 1);
	const latestVersion = findRecord(versions, "version", updatedVersion);
	assertEquals(getString(initialVersion, "path"), HA2HA_PATHS.status);
	assertEquals(getString(latestVersion, "updatedBy"), actor);
	return body;
};

const checkHistoricalFileRead = async ({
	context,
	fetchImpl,
	target,
}: {
	context: WorkspaceContext;
	fetchImpl: typeof fetch;
	target: string;
}) => {
	const response = await fetchImpl(
		`${target}/api/workspaces/${context.workspaceId}/files/versions/1?path=${encodeURIComponent(HA2HA_PATHS.status)}&edit=${context.editToken}`
	);
	const body = await readJson(response);
	assertStatus(response, 200);
	assertEquals(getString(body, "path"), HA2HA_PATHS.status);
	assertEquals(getNumber(body, "version"), 1);
	assertIncludes(getString(body, "content") ?? "", "HTTP conformance setup");
	return body;
};

const recordCheck = async <Value>(
	checks: Ha2haConformanceCheck[],
	{
		id,
		profile,
		run,
	}: {
		id: string;
		profile: Ha2haConformanceProfile;
		run: () => Promise<Value> | Value;
	}
): Promise<Value | null> => {
	try {
		const value = await run();
		checks.push({
			id,
			message: "pass",
			ok: true,
			profile,
		});
		return value;
	} catch (error) {
		checks.push({
			id,
			message: error instanceof Error ? error.message : "Unknown failure.",
			ok: false,
			profile,
		});
		return null;
	}
};

const buildResult = ({
	checks,
	implementation,
	profiles,
	target,
}: {
	checks: Ha2haConformanceCheck[];
	implementation: string;
	profiles: Ha2haConformanceProfile[];
	target: string;
}): Ha2haConformanceResult => ({
	checks,
	implementation,
	ok: checks.every((check) => check.ok),
	profiles,
	target,
	timestamp: new Date().toISOString(),
});

const authHeaders = (editToken: string) => ({
	Authorization: `Bearer ${editToken}`,
	"Content-Type": "application/json",
});

const normalizeBaseUrl = (baseUrl: string) =>
	baseUrl.replace(TRAILING_SLASH_PATTERN, "");

const encodePath = (filePath: string) =>
	filePath.split("/").map(encodeURIComponent).join("/");

const readJson = async (response: Response): Promise<unknown> => {
	try {
		return await response.json();
	} catch {
		return null;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: unknown, key: string): string | null => {
	if (!isRecord(value)) {
		return null;
	}
	const field = value[key];
	return typeof field === "string" ? field : null;
};

const getNumber = (value: unknown, key: string): number => {
	if (!isRecord(value)) {
		throw new Error(`Expected object with numeric ${key}.`);
	}
	const field = value[key];
	if (typeof field !== "number") {
		throw new Error(`Expected numeric ${key}.`);
	}
	return field;
};

const getArray = (value: unknown, key: string): unknown[] => {
	if (!isRecord(value)) {
		throw new Error(`Expected object with array ${key}.`);
	}
	const field = value[key];
	if (!Array.isArray(field)) {
		throw new Error(`Expected array ${key}.`);
	}
	return field;
};

const findRecord = (
	values: unknown[],
	key: string,
	expectedValue: number | string
): Record<string, unknown> => {
	const record = values.find(
		(value) => isRecord(value) && value[key] === expectedValue
	);
	if (!isRecord(record)) {
		throw new Error(`Expected record with ${key} ${String(expectedValue)}.`);
	}
	return record;
};

const getVersion = (value: unknown): number => getNumber(value, "version");

const assertStatus = (response: Response, expectedStatus: number) => {
	if (response.status !== expectedStatus) {
		throw new Error(`Expected HTTP ${expectedStatus}, got ${response.status}.`);
	}
};

const assertHeaderEquals = (
	response: Response,
	header: string,
	expectedValue: string
) => {
	const value = response.headers.get(header);
	if (value !== expectedValue) {
		throw new Error(`Expected ${header} ${expectedValue}, got ${value}.`);
	}
};

const assertHeaderIncludes = (
	response: Response,
	header: string,
	expectedValue: string
) => {
	const value = response.headers.get(header);
	if (!value?.includes(expectedValue)) {
		throw new Error(`Expected ${header} to include ${expectedValue}.`);
	}
};

const assertIncludes = (value: string, expected: string) => {
	if (!value.includes(expected)) {
		throw new Error(`Expected value to include ${expected}.`);
	}
};

const assertEquals = (actual: unknown, expected: unknown) => {
	if (actual !== expected) {
		throw new Error(`Expected ${String(expected)}, got ${String(actual)}.`);
	}
};

const requireString = (value: unknown, label: string): string => {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Expected ${label}.`);
	}
	return value;
};

const assertPositiveNumber = (value: number, label: string) => {
	if (!(Number.isInteger(value) && value > 0)) {
		throw new Error(`Expected positive integer ${label}.`);
	}
};
