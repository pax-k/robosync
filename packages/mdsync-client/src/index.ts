import {
	createHa2haClient as createHa2haProtocolClient,
	createHttpTransport,
	type Ha2haClient,
} from "@ha2ha/client";

const DEFAULT_ACTOR = "mdsync-client";
const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";
const TRAILING_SLASH_PATTERN = /\/$/u;

export type MdsyncClientErrorCode =
	| "comment_anchor_not_found"
	| "comment_not_found"
	| "file_not_found"
	| "invalid_request"
	| "invalid_retention_cutoff"
	| "invalid_token"
	| "missing_token"
	| "not_found"
	| "transport_error"
	| "unsupported_operation"
	| "validation_error"
	| "version_conflict"
	| "workspace_not_found"
	| "write_disabled";

export interface MdsyncClientError {
	code: MdsyncClientErrorCode;
	latest?: MdsyncFile | null;
	message: string;
	status?: number;
}

export type MdsyncResult<Data> =
	| { data: Data; ok: true }
	| { error: MdsyncClientError; ok: false };

export type MdsyncAuth =
	| { kind: "bearer"; token: string }
	| { kind: "edit-token"; token: string }
	| { kind: "none" }
	| { kind: "read-token"; token: string };

export interface CreateMdsyncClientOptions {
	actor?: string;
	apiOrigin: string;
	auth?: MdsyncAuth;
	fetch?: typeof fetch;
	workspaceId?: string;
}

export interface MdsyncWorkspaceFileInput {
	content: string;
	contentType?: string;
	path: string;
}

export interface CreateWorkspaceInput {
	actor?: string;
	files: MdsyncWorkspaceFileInput[];
	readAccess?: "public" | "token";
	title?: string;
	writeAccess?: "none" | "public" | "token";
}

export interface MdsyncCreatedWorkspace {
	createdAt?: string;
	editUrl?: string;
	id: string;
	rawUrl: string;
	title?: string | null;
	workspaceUrl: string;
}

export interface MdsyncWorkspace {
	createdAt?: string;
	id: string;
	readAccess?: "public" | "token";
	title?: string | null;
	updatedAt?: string;
	writeAccess?: "none" | "public" | "token";
}

export interface MdsyncWorkspaceListing {
	files: Array<{ path: string; version?: number }>;
	workspaceId: string;
}

export interface MdsyncFile {
	content: string;
	contentType: string;
	path: string;
	updatedAt?: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface MdsyncWriteFileInput {
	actor?: string;
	baseVersion?: number | null;
	content: string;
	contentType?: string;
	path: string;
}

export interface MdsyncWriteResult {
	path: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface MdsyncDeleteFileInput {
	actor?: string;
	baseVersion: number;
	path: string;
}

export interface MdsyncDeleteResult {
	deleted: true;
	deletedBy?: string | null;
	path: string;
	workspaceId: string;
}

export interface MdsyncWorkspaceEvent {
	actor: string | null;
	createdAt?: string;
	id?: string;
	path: string | null;
	payload?: Record<string, unknown>;
	type: string;
	version: number | null;
	workspaceId: string;
}

export interface MdsyncFileVersion {
	contentType?: string;
	createdAt?: string;
	path: string;
	sha256?: string | null;
	sizeBytes?: number;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface MdsyncCommentSelector {
	heading?: string;
	line?: number;
}

export interface MdsyncComment {
	anchor: Record<string, unknown>;
	authorId: string | null;
	body: string;
	createdAt?: string;
	id: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt?: string;
	version: number;
	workspaceId: string;
}

export interface CreateCommentInput {
	actor?: string;
	body: string;
	path: string;
	selector?: MdsyncCommentSelector;
	version: number;
}

export interface ListCommentsInput {
	path?: string;
}

export interface ResolveCommentInput {
	actor?: string;
	commentId: string;
}

export interface MdsyncCapabilities {
	edit: {
		access: string;
		canRevoke: boolean;
		canRotate: boolean;
		tokenActive: boolean;
	};
	read: {
		access: string;
		canRevoke: boolean;
		canRotate: boolean;
		tokenActive: boolean;
	};
}

export interface MdsyncCapabilityPayload {
	capabilities: MdsyncCapabilities;
	workspaceId: string;
}

export interface MdsyncCapabilityRotationPayload
	extends MdsyncCapabilityPayload {
	capability: "edit" | "read";
	links: {
		editUrl?: string;
		rawUrl?: string;
		workspaceUrl?: string;
	};
}

export interface MdsyncCapabilityRevocationPayload
	extends MdsyncCapabilityPayload {
	capability: "edit" | "read";
	revoked: true;
}

export interface MdsyncAdminStats {
	workspaceId: string;
	[key: string]: unknown;
}

export interface MdsyncAdminEvent {
	actor: string | null;
	createdAt?: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
}

export interface MdsyncWorkspaceExportBundle {
	adminEvents: MdsyncAdminEvent[];
	comments: MdsyncComment[];
	events: MdsyncWorkspaceEvent[];
	exportedAt?: string;
	files: MdsyncFile[];
	fileVersions: MdsyncFile[];
	format: string;
	retention?: unknown;
	schemaVersion: number;
	workspace: {
		id: string;
		title?: string | null;
		[key: string]: unknown;
	};
}

export interface MdsyncImportedWorkspace extends MdsyncCreatedWorkspace {
	importedAt?: string;
	importedCounts?: {
		adminEvents: number;
		comments: number;
		events: number;
		fileVersions: number;
		files: number;
	};
	sourceWorkspaceId?: string;
}

export interface MdsyncRetentionPolicy {
	retention: {
		[key: string]: unknown;
	};
	workspaceId: string;
}

export interface PruneRetentionInput {
	before: string;
	include?: {
		adminEvents?: boolean;
		events?: boolean;
		fileVersions?: boolean;
		resolvedComments?: boolean;
	};
	orphanedObjectKeys?: string[];
}

export interface MdsyncRetentionPruneResult {
	before?: string;
	pruned: Record<string, number>;
	skipped?: Record<string, number>;
	workspaceId: string;
}

export interface MdsyncLinkInput {
	path?: string;
	workspaceId?: string;
}

export interface CreateHostedHa2haClientInput {
	actor?: string;
	workspaceId?: string;
}

export interface MdsyncClient {
	createComment: (
		input: CreateCommentInput
	) => Promise<MdsyncResult<MdsyncComment>>;
	createHa2haClient: (
		input?: CreateHostedHa2haClientInput
	) => MdsyncResult<Ha2haClient>;
	createWorkspace: (
		input: CreateWorkspaceInput
	) => Promise<MdsyncResult<MdsyncCreatedWorkspace>>;
	deleteFile: (
		input: MdsyncDeleteFileInput
	) => Promise<MdsyncResult<MdsyncDeleteResult>>;
	editUrl: (input?: MdsyncLinkInput) => MdsyncResult<string>;
	exportWorkspace: () => Promise<MdsyncResult<MdsyncWorkspaceExportBundle>>;
	getAdminStats: () => Promise<MdsyncResult<MdsyncAdminStats>>;
	getCapabilities: () => Promise<MdsyncResult<MdsyncCapabilityPayload>>;
	getRetention: () => Promise<MdsyncResult<MdsyncRetentionPolicy>>;
	getWorkspace: () => Promise<MdsyncResult<MdsyncWorkspace>>;
	importWorkspace: (
		bundle: MdsyncWorkspaceExportBundle
	) => Promise<MdsyncResult<MdsyncImportedWorkspace>>;
	listComments: (
		input?: ListCommentsInput
	) => Promise<
		MdsyncResult<{ comments: MdsyncComment[]; workspaceId: string }>
	>;
	listEvents: () => Promise<
		MdsyncResult<{ events: MdsyncWorkspaceEvent[]; workspaceId: string }>
	>;
	listFiles: () => Promise<MdsyncResult<MdsyncWorkspaceListing>>;
	listFileVersions: (path: string) => Promise<
		MdsyncResult<{
			path: string;
			versions: MdsyncFileVersion[];
			workspaceId: string;
		}>
	>;
	pruneRetention: (
		input: PruneRetentionInput
	) => Promise<MdsyncResult<MdsyncRetentionPruneResult>>;
	rawUrl: (input?: MdsyncLinkInput) => MdsyncResult<string>;
	readFile: (path: string) => Promise<MdsyncResult<MdsyncFile>>;
	readFileVersion: (input: {
		path: string;
		version: number;
	}) => Promise<MdsyncResult<MdsyncFile>>;
	resolveComment: (
		input: ResolveCommentInput
	) => Promise<MdsyncResult<MdsyncComment>>;
	revokeCapability: (
		capability: "edit" | "read"
	) => Promise<MdsyncResult<MdsyncCapabilityRevocationPayload>>;
	rotateCapability: (
		capability: "edit" | "read"
	) => Promise<MdsyncResult<MdsyncCapabilityRotationPayload>>;
	workspaceUrl: (input?: MdsyncLinkInput) => MdsyncResult<string>;
	writeFile: (
		input: MdsyncWriteFileInput
	) => Promise<MdsyncResult<MdsyncWriteResult>>;
}

type AuthRequirement = "edit" | "none" | "read";

export const createMdsyncClient = ({
	actor = DEFAULT_ACTOR,
	apiOrigin,
	auth = { kind: "none" },
	fetch: fetchImpl = fetch,
	workspaceId,
}: CreateMdsyncClientOptions): MdsyncClient => {
	const origin = apiOrigin.replace(TRAILING_SLASH_PATTERN, "");

	const scopedRequest = <Data>({
		body,
		method = "GET",
		parse,
		pathname,
		query,
		requirement = "read",
	}: RequestInput<Data>) => {
		const resolvedWorkspaceId = resolveWorkspaceId(workspaceId);
		if (!resolvedWorkspaceId.ok) {
			return Promise.resolve(resolvedWorkspaceId);
		}
		return requestJson({
			auth,
			body,
			fetchImpl,
			method,
			origin,
			parse,
			pathname: pathname(resolvedWorkspaceId.data),
			query,
			requirement,
		});
	};

	return {
		createComment: (input) =>
			scopedRequest({
				body: {
					actor: input.actor ?? actor,
					body: input.body,
					path: input.path,
					selector: input.selector,
					version: input.version,
				},
				method: "POST",
				parse: parseComment,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/comments`,
				requirement: "edit",
			}),
		createHa2haClient: (input = {}) => {
			const id = resolveWorkspaceId(input.workspaceId ?? workspaceId);
			if (!id.ok) {
				return id;
			}
			if (!(auth.kind === "edit-token" || auth.kind === "bearer")) {
				return err(
					"missing_token",
					"Hosted HA2HA client workflows require edit-token or bearer auth."
				);
			}
			return ok(
				createHa2haProtocolClient({
					actor: input.actor ?? actor,
					transport: createHttpTransport({
						authorizeRequest: ({ init }: { init: RequestInit; url: string }) =>
							withAuthorizationHeader(init, auth),
						baseUrl: origin,
						fetch: fetchImpl,
						workspaceId: id.data,
					}),
				})
			);
		},
		createWorkspace: (input) =>
			requestJson({
				auth,
				body: { ...input, actor: input.actor ?? actor },
				fetchImpl,
				method: "POST",
				origin,
				parse: parseCreatedWorkspace,
				pathname: "/api/workspaces",
				requirement: "none",
			}),
		deleteFile: (input) =>
			scopedRequest({
				body: { actor: input.actor ?? actor, baseVersion: input.baseVersion },
				method: "DELETE",
				parse: parseDeleteResult,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/files`,
				query: { path: input.path },
				requirement: "edit",
			}),
		editUrl: (input = {}) =>
			buildProductLink({ auth, input, mode: "edit", origin, workspaceId }),
		exportWorkspace: () =>
			scopedRequest({
				parse: parseExportBundle,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/export`,
				requirement: "edit",
			}),
		getAdminStats: () =>
			scopedRequest({
				parse: parseAdminStats,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/admin/stats`,
				requirement: "edit",
			}),
		getCapabilities: () =>
			scopedRequest({
				parse: parseCapabilityPayload,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/capabilities`,
				requirement: "edit",
			}),
		getRetention: () =>
			scopedRequest({
				parse: parseRetentionPolicy,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/retention`,
				requirement: "edit",
			}),
		getWorkspace: () =>
			scopedRequest({
				parse: parseWorkspace,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}`,
			}),
		importWorkspace: (bundle) =>
			requestJson({
				auth,
				body: bundle,
				fetchImpl,
				method: "POST",
				origin,
				parse: parseImportedWorkspace,
				pathname: "/api/workspaces/import",
				requirement: "none",
			}),
		listComments: (input = {}) =>
			scopedRequest({
				parse: (value) => ({
					comments: getArray(getRecord(value).comments).map(parseComment),
					workspaceId: getString(value, "workspaceId", workspaceId ?? ""),
				}),
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/comments`,
				query: input.path ? { path: input.path } : undefined,
			}),
		listEvents: () =>
			scopedRequest({
				parse: (value) => ({
					events: getArray(getRecord(value).events).map(parseWorkspaceEvent),
					workspaceId: getString(value, "workspaceId", workspaceId ?? ""),
				}),
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/events`,
			}),
		listFiles: () =>
			scopedRequest({
				parse: parseWorkspaceListing,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/tree`,
			}),
		listFileVersions: (path) =>
			scopedRequest({
				parse: (value) => ({
					path: getString(value, "path", path),
					versions: getArray(getRecord(value).versions).map(parseFileVersion),
					workspaceId: getString(value, "workspaceId", workspaceId ?? ""),
				}),
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/files/versions`,
				query: { path },
			}),
		pruneRetention: (input) =>
			scopedRequest({
				body: input,
				method: "POST",
				parse: parseRetentionPruneResult,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/retention/prune`,
				requirement: "edit",
			}),
		rawUrl: (input = {}) =>
			buildProductLink({ auth, input, mode: "raw", origin, workspaceId }),
		readFile: (path) =>
			scopedRequest({
				parse: parseFile,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/files`,
				query: { path },
			}),
		readFileVersion: (input) =>
			scopedRequest({
				parse: parseFile,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/files/versions/${input.version}`,
				query: { path: input.path },
			}),
		resolveComment: (input) =>
			scopedRequest({
				body: { actor: input.actor ?? actor },
				method: "POST",
				parse: parseComment,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/comments/${encodeURIComponent(
						input.commentId
					)}/resolve`,
				requirement: "edit",
			}),
		revokeCapability: (capability) =>
			scopedRequest({
				method: "POST",
				parse: parseCapabilityRevocationPayload,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/capabilities/${capability}/revoke`,
				requirement: "edit",
			}),
		rotateCapability: (capability) =>
			scopedRequest({
				method: "POST",
				parse: parseCapabilityRotationPayload,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/capabilities/${capability}/rotate`,
				requirement: "edit",
			}),
		workspaceUrl: (input = {}) =>
			buildProductLink({ auth, input, mode: "workspace", origin, workspaceId }),
		writeFile: (input) =>
			scopedRequest({
				body: {
					actor: input.actor ?? actor,
					baseVersion: input.baseVersion,
					content: input.content,
					contentType: input.contentType ?? contentTypeForPath(input.path),
					path: input.path,
				},
				method: "PUT",
				parse: parseWriteResult,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/files`,
				requirement: "edit",
			}),
	};
};

interface RequestInput<Data> {
	body?: unknown;
	method?: string;
	parse: (value: unknown) => Data;
	pathname: (workspaceId: string) => string;
	query?: Record<string, string>;
	requirement?: AuthRequirement;
}

const requestJson = async <Data>({
	auth,
	body,
	fetchImpl,
	method,
	origin,
	parse,
	pathname,
	query,
	requirement,
}: {
	auth: MdsyncAuth;
	body?: unknown;
	fetchImpl: typeof fetch;
	method: string;
	origin: string;
	parse: (value: unknown) => Data;
	pathname: string;
	query?: Record<string, string>;
	requirement: AuthRequirement;
}): Promise<MdsyncResult<Data>> => {
	if (requirement === "edit" && !canUseEditAuth(auth)) {
		return err(
			"missing_token",
			"An edit token or bearer token is required for this MDSync operation."
		);
	}

	const url = buildRequestUrl({ auth, origin, pathname, query, requirement });
	const init = withAuthorizationHeader(
		{
			body: body === undefined ? undefined : JSON.stringify(body),
			headers:
				body === undefined ? undefined : { "Content-Type": "application/json" },
			method,
		},
		auth
	);

	try {
		const response = await fetchImpl(url, init);
		if (response.status === 409) {
			return parseConflict(response);
		}
		if (!response.ok) {
			return responseError(response);
		}
		return ok(parse(await readJson(response)));
	} catch (error) {
		return err("transport_error", messageFromCaught(error));
	}
};

const buildRequestUrl = ({
	auth,
	origin,
	pathname,
	query,
	requirement,
}: {
	auth: MdsyncAuth;
	origin: string;
	pathname: string;
	query?: Record<string, string>;
	requirement: AuthRequirement;
}) => {
	const url = new URL(pathname, `${origin}/`);
	for (const [key, value] of Object.entries(query ?? {})) {
		url.searchParams.set(key, value);
	}
	if (auth.kind === "read-token" && requirement === "read") {
		url.searchParams.set("k", auth.token);
	}
	return url.toString();
};

const withAuthorizationHeader = (
	init: RequestInit,
	auth: MdsyncAuth
): RequestInit => {
	if (!(auth.kind === "edit-token" || auth.kind === "bearer")) {
		return init;
	}
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${auth.token}`);
	return { ...init, headers };
};

const buildProductLink = ({
	auth,
	input,
	mode,
	origin,
	workspaceId,
}: {
	auth: MdsyncAuth;
	input: MdsyncLinkInput;
	mode: "edit" | "raw" | "workspace";
	origin: string;
	workspaceId?: string;
}): MdsyncResult<string> => {
	const resolvedWorkspaceId = resolveWorkspaceId(
		input.workspaceId ?? workspaceId
	);
	if (!resolvedWorkspaceId.ok) {
		return resolvedWorkspaceId;
	}
	const encodedWorkspaceId = encodeURIComponent(resolvedWorkspaceId.data);
	const encodedPath = input.path
		? `/${input.path.split("/").map(encodeURIComponent).join("/")}`
		: "";
	const pathname =
		mode === "raw"
			? `/w/${encodedWorkspaceId}/raw${encodedPath}`
			: `/w/${encodedWorkspaceId}`;
	const url = new URL(pathname, `${origin}/`);
	if (mode === "edit" && auth.kind === "edit-token") {
		url.searchParams.set("edit", auth.token);
	}
	if (mode !== "edit" && auth.kind === "read-token") {
		url.searchParams.set("k", auth.token);
	}
	if (mode === "workspace" && auth.kind === "edit-token") {
		url.searchParams.set("edit", auth.token);
	}
	return ok(url.toString());
};

const resolveWorkspaceId = (workspaceId?: string): MdsyncResult<string> =>
	workspaceId && workspaceId.length > 0
		? ok(workspaceId)
		: err("validation_error", "A workspaceId is required for this operation.");

const canUseEditAuth = (auth: MdsyncAuth) =>
	auth.kind === "edit-token" || auth.kind === "bearer";

const readJson = async (response: Response): Promise<unknown> => {
	const text = await response.text();
	return text.length > 0 ? JSON.parse(text) : {};
};

const parseConflict = async <Data>(
	response: Response
): Promise<MdsyncResult<Data>> => {
	const body = getRecord(await readJson(response));
	return err(
		"version_conflict",
		getString(body, "message", "Version conflict."),
		{
			latest: parseNullableFile(body.latest),
			status: response.status,
		}
	);
};

const responseError = async <Data>(
	response: Response
): Promise<MdsyncResult<Data>> => {
	let body: unknown = {};
	try {
		body = await readJson(response);
	} catch {
		body = {};
	}
	const record = getRecord(body);
	return err(
		toErrorCode(
			getString(
				record,
				"error",
				response.status === 404 ? "not_found" : "transport_error"
			)
		),
		getString(record, "message", response.statusText),
		{ status: response.status }
	);
};

const parseCreatedWorkspace = (value: unknown): MdsyncCreatedWorkspace => ({
	createdAt: getOptionalString(value, "createdAt") ?? undefined,
	editUrl: getOptionalString(value, "editUrl") ?? undefined,
	id: getString(value, "id", ""),
	rawUrl: getString(value, "rawUrl", ""),
	title: getOptionalString(value, "title"),
	workspaceUrl: getString(value, "workspaceUrl", ""),
});

const parseImportedWorkspace = (value: unknown): MdsyncImportedWorkspace => {
	const importedCounts = getRecord(getRecord(value).importedCounts);
	return {
		...parseCreatedWorkspace(value),
		importedAt: getOptionalString(value, "importedAt") ?? undefined,
		importedCounts: Object.keys(importedCounts).length
			? {
					adminEvents: getNumber(importedCounts, "adminEvents", 0),
					comments: getNumber(importedCounts, "comments", 0),
					events: getNumber(importedCounts, "events", 0),
					files: getNumber(importedCounts, "files", 0),
					fileVersions: getNumber(importedCounts, "fileVersions", 0),
				}
			: undefined,
		sourceWorkspaceId:
			getOptionalString(value, "sourceWorkspaceId") ?? undefined,
	};
};

const parseWorkspace = (value: unknown): MdsyncWorkspace => ({
	createdAt: getOptionalString(value, "createdAt") ?? undefined,
	id: getString(value, "id", ""),
	readAccess: parseAccess(getOptionalString(value, "readAccess")),
	title: getOptionalString(value, "title"),
	updatedAt: getOptionalString(value, "updatedAt") ?? undefined,
	writeAccess: parseWriteAccess(getOptionalString(value, "writeAccess")),
});

const parseWorkspaceListing = (value: unknown): MdsyncWorkspaceListing => ({
	files: getArray(getRecord(value).files).map((file) => ({
		path: getString(file, "path", ""),
		version: getOptionalNumber(file, "version"),
	})),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseNullableFile = (value: unknown): MdsyncFile | null =>
	value === null ? null : parseFile(value);

const parseFile = (value: unknown): MdsyncFile => ({
	content: getString(value, "content", ""),
	contentType: getString(value, "contentType", DEFAULT_CONTENT_TYPE),
	path: getString(value, "path", ""),
	updatedAt: getOptionalString(value, "updatedAt") ?? undefined,
	updatedBy: getOptionalString(value, "updatedBy"),
	version: getNumber(value, "version", 0),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseWriteResult = (value: unknown): MdsyncWriteResult => ({
	path: getString(value, "path", ""),
	updatedBy: getOptionalString(value, "updatedBy"),
	version: getNumber(value, "version", 0),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseDeleteResult = (value: unknown): MdsyncDeleteResult => ({
	deleted: true,
	deletedBy: getOptionalString(value, "deletedBy"),
	path: getString(value, "path", ""),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseWorkspaceEvent = (value: unknown): MdsyncWorkspaceEvent => ({
	actor: getOptionalString(value, "actor"),
	createdAt: getOptionalString(value, "createdAt") ?? undefined,
	id: getOptionalString(value, "id") ?? undefined,
	path: getOptionalString(value, "path"),
	payload: getRecord(getRecord(value).payload),
	type: getString(value, "type", ""),
	version: getOptionalNumber(value, "version") ?? null,
	workspaceId: getString(value, "workspaceId", ""),
});

const parseFileVersion = (value: unknown): MdsyncFileVersion => ({
	contentType: getOptionalString(value, "contentType") ?? undefined,
	createdAt: getOptionalString(value, "createdAt") ?? undefined,
	path: getString(value, "path", ""),
	sha256: getOptionalString(value, "sha256"),
	sizeBytes: getOptionalNumber(value, "sizeBytes"),
	updatedBy: getOptionalString(value, "updatedBy"),
	version: getNumber(value, "version", 0),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseComment = (value: unknown): MdsyncComment => ({
	anchor: getRecord(getRecord(value).anchor),
	authorId: getOptionalString(value, "authorId"),
	body: getString(value, "body", ""),
	createdAt: getOptionalString(value, "createdAt") ?? undefined,
	id: getString(value, "id", ""),
	path: getString(value, "path", ""),
	resolvedAt: getOptionalString(value, "resolvedAt"),
	resolvedBy: getOptionalString(value, "resolvedBy"),
	updatedAt: getOptionalString(value, "updatedAt") ?? undefined,
	version: getNumber(value, "version", 0),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseCapabilityPayload = (value: unknown): MdsyncCapabilityPayload => ({
	capabilities: parseCapabilities(getRecord(value).capabilities),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseCapabilityRotationPayload = (
	value: unknown
): MdsyncCapabilityRotationPayload => ({
	...parseCapabilityPayload(value),
	capability: parseCapability(getOptionalString(value, "capability")),
	links: {
		editUrl: getOptionalString(getRecord(value).links, "editUrl") ?? undefined,
		rawUrl: getOptionalString(getRecord(value).links, "rawUrl") ?? undefined,
		workspaceUrl:
			getOptionalString(getRecord(value).links, "workspaceUrl") ?? undefined,
	},
});

const parseCapabilityRevocationPayload = (
	value: unknown
): MdsyncCapabilityRevocationPayload => ({
	...parseCapabilityPayload(value),
	capability: parseCapability(getOptionalString(value, "capability")),
	revoked: true,
});

const parseCapabilities = (value: unknown): MdsyncCapabilities => {
	const record = getRecord(value);
	return {
		edit: parseCapabilityState(record.edit),
		read: parseCapabilityState(record.read),
	};
};

const parseCapabilityState = (value: unknown) => ({
	access: getString(value, "access", ""),
	canRevoke: getBoolean(value, "canRevoke", false),
	canRotate: getBoolean(value, "canRotate", false),
	tokenActive: getBoolean(value, "tokenActive", false),
});

const parseAdminStats = (value: unknown): MdsyncAdminStats => ({
	...getRecord(value),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseExportBundle = (value: unknown): MdsyncWorkspaceExportBundle => {
	const record = getRecord(value);
	return {
		adminEvents: getArray(record.adminEvents).map(parseAdminEvent),
		comments: getArray(record.comments).map(parseComment),
		events: getArray(record.events).map(parseWorkspaceEvent),
		exportedAt: getOptionalString(record, "exportedAt") ?? undefined,
		files: getArray(record.files).map(parseFile),
		fileVersions: getArray(record.fileVersions).map(parseFile),
		format: getString(record, "format", ""),
		retention: record.retention,
		schemaVersion: getNumber(record, "schemaVersion", 0),
		workspace: {
			...getRecord(record.workspace),
			id: getString(record.workspace, "id", ""),
			title: getOptionalString(record.workspace, "title"),
		},
	};
};

const parseAdminEvent = (value: unknown): MdsyncAdminEvent => ({
	actor: getOptionalString(value, "actor"),
	createdAt: getOptionalString(value, "createdAt") ?? undefined,
	path: getOptionalString(value, "path"),
	payload: getRecord(getRecord(value).payload),
	type: getString(value, "type", ""),
});

const parseRetentionPolicy = (value: unknown): MdsyncRetentionPolicy => ({
	retention: getRecord(getRecord(value).retention),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseRetentionPruneResult = (
	value: unknown
): MdsyncRetentionPruneResult => ({
	before: getOptionalString(value, "before") ?? undefined,
	pruned: getNumberRecord(getRecord(getRecord(value).pruned)),
	skipped: getNumberRecord(getRecord(getRecord(value).skipped)),
	workspaceId: getString(value, "workspaceId", ""),
});

const parseAccess = (value: string | null): "public" | "token" | undefined =>
	value === "public" || value === "token" ? value : undefined;

const parseWriteAccess = (
	value: string | null
): "none" | "public" | "token" | undefined =>
	value === "none" || value === "public" || value === "token"
		? value
		: undefined;

const parseCapability = (value: string | null): "edit" | "read" =>
	value === "read" ? "read" : "edit";

const contentTypeForPath = (path: string) =>
	path.endsWith(".md") ? DEFAULT_CONTENT_TYPE : "application/octet-stream";

const ok = <Data>(data: Data): MdsyncResult<Data> => ({ data, ok: true });

const err = <Data>(
	code: MdsyncClientErrorCode,
	message: string,
	extra: Omit<MdsyncClientError, "code" | "message"> = {}
): MdsyncResult<Data> => ({
	error: { code, message, ...extra },
	ok: false,
});

const toErrorCode = (value: string): MdsyncClientErrorCode => {
	const known = new Set<MdsyncClientErrorCode>([
		"comment_anchor_not_found",
		"comment_not_found",
		"file_not_found",
		"invalid_request",
		"invalid_retention_cutoff",
		"invalid_token",
		"missing_token",
		"not_found",
		"transport_error",
		"unsupported_operation",
		"validation_error",
		"version_conflict",
		"workspace_not_found",
		"write_disabled",
	]);
	return known.has(value as MdsyncClientErrorCode)
		? (value as MdsyncClientErrorCode)
		: "transport_error";
};

const getRecord = (value: unknown): Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const getArray = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : [];

const getString = (value: unknown, key: string, fallback: string): string => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "string" ? candidate : fallback;
};

const getOptionalString = (value: unknown, key: string): string | null => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "string" ? candidate : null;
};

const getNumber = (value: unknown, key: string, fallback: number): number => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "number" ? candidate : fallback;
};

const getOptionalNumber = (value: unknown, key: string): number | undefined => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "number" ? candidate : undefined;
};

const getBoolean = (
	value: unknown,
	key: string,
	fallback: boolean
): boolean => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "boolean" ? candidate : fallback;
};

const getNumberRecord = (value: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, number] => typeof entry[1] === "number"
		)
	);

const messageFromCaught = (error: unknown): string =>
	error instanceof Error ? error.message : "MDSync request failed.";
