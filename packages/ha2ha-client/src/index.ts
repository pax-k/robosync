import { createHash } from "node:crypto";
import {
	cp,
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
	HA2HA_CONFLICT,
	HA2HA_EVENT_TYPES,
	HA2HA_PATHS,
	type Ha2haEvidenceResult,
	type Ha2haTargetCoordinate,
	type Ha2haValidationResult,
	ha2haConflictResponseSchema,
	ha2haWorkspaceManifestSchema,
	ha2haWorkspacePathSchema,
	validateHa2haWorkspace,
} from "@ha2ha/protocol";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u;
const JSON_INDENT_SPACES = 2;
const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";
const MARKDOWN_EXTENSION_PATTERN = /\.md$/u;
const TRAILING_SLASH_PATTERN = /\/$/u;

export type Ha2haClientErrorCode =
	| "invalid_request"
	| "not_found"
	| "task_owned"
	| "transport_error"
	| "unsupported_operation"
	| "validation_error"
	| "version_conflict";

export interface Ha2haClientError {
	code: Ha2haClientErrorCode;
	latest?: Ha2haTargetCoordinate & {
		content?: string;
		contentType?: string;
		updatedAt?: string;
		updatedBy?: string | null;
	};
	message: string;
	status?: number;
}

export type Ha2haResult<Data> =
	| { data: Data; ok: true }
	| { error: Ha2haClientError; ok: false };

export interface Ha2haFile {
	content: string;
	contentType: string;
	path: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface Ha2haWorkspaceListing {
	files: Array<{ path: string; version?: number }>;
	workspaceId: string;
}

export interface Ha2haWriteResult {
	path: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface Ha2haDeleteResult {
	deleted: true;
	deletedBy?: string | null;
	path: string;
	workspaceId: string;
}

export interface Ha2haTransport {
	deleteFile: (
		input: TransportDeleteInput
	) => Promise<Ha2haResult<Ha2haDeleteResult>>;
	listWorkspace: () => Promise<Ha2haResult<Ha2haWorkspaceListing>>;
	readFile: (path: string) => Promise<Ha2haResult<Ha2haFile>>;
	validateWorkspace?: () => Promise<Ha2haResult<Ha2haValidationResult>>;
	writeFile: (
		input: TransportWriteInput
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}

export interface TransportWriteInput {
	actor: string;
	baseVersion?: number | null;
	content: string;
	contentType?: string;
	path: string;
}

export interface TransportDeleteInput {
	actor: string;
	baseVersion: number;
	path: string;
}

export interface CreateHa2haClientOptions {
	actor: string;
	clock?: () => Date;
	transport: Ha2haTransport;
}

export interface ClaimTaskInput {
	owner?: string;
	path?: string;
	state?: "claimed" | "working";
	taskId: string;
}

export interface AddEvidenceInput {
	body?: string;
	evidencePath?: string;
	id?: string;
	kind: string;
	result: Ha2haEvidenceResult;
	target?: Ha2haTargetCoordinate;
	taskId: string;
}

export interface RecordDecisionInput {
	body: string;
	path?: string;
	title: string;
}

export interface WriteHandoffInput {
	body: string;
	path?: string;
	taskId?: string;
}

export interface Ha2haClient {
	addEvidence: (
		input: AddEvidenceInput
	) => Promise<
		Ha2haResult<{ evidence: Ha2haWriteResult; task: Ha2haWriteResult }>
	>;
	claimTask: (input: ClaimTaskInput) => Promise<Ha2haResult<Ha2haWriteResult>>;
	deleteFile: (
		input: Omit<TransportDeleteInput, "actor">
	) => Promise<Ha2haResult<Ha2haDeleteResult>>;
	listWorkspace: () => Promise<Ha2haResult<Ha2haWorkspaceListing>>;
	readFile: (path: string) => Promise<Ha2haResult<Ha2haFile>>;
	recordDecision: (
		input: RecordDecisionInput
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
	validateWorkspace: () => Promise<Ha2haResult<Ha2haValidationResult>>;
	writeFile: (
		input: Omit<TransportWriteInput, "actor">
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
	writeHandoff: (
		input: WriteHandoffInput
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}

export const createHa2haClient = ({
	actor,
	clock = () => new Date(),
	transport,
}: CreateHa2haClientOptions): Ha2haClient => {
	const writeFileWithActor = (
		input: Omit<TransportWriteInput, "actor">
	): Promise<Ha2haResult<Ha2haWriteResult>> =>
		transport.writeFile({ ...input, actor });

	return {
		addEvidence: (input) =>
			addEvidence({ actor, clock, input, transport, writeFileWithActor }),
		claimTask: (input) =>
			claimTask({ actor, input, transport, writeFileWithActor }),
		deleteFile: (input) => transport.deleteFile({ ...input, actor }),
		listWorkspace: () => transport.listWorkspace(),
		readFile: (filePath) => transport.readFile(filePath),
		recordDecision: (input) =>
			recordDecision({ clock, input, writeFileWithActor }),
		validateWorkspace: () =>
			transport.validateWorkspace?.() ??
			Promise.resolve(
				err(
					"unsupported_operation",
					"This transport cannot validate a workspace."
				)
			),
		writeFile: writeFileWithActor,
		writeHandoff: (input) => writeHandoff({ clock, input, writeFileWithActor }),
	};
};

export interface CreateHttpTransportOptions {
	authorizeRequest?: (request: {
		init: RequestInit;
		url: string;
	}) => Promise<RequestInit | undefined> | RequestInit | undefined;
	baseUrl: string;
	fetch?: typeof fetch;
	workspaceId: string;
}

export const createHttpTransport = ({
	authorizeRequest,
	baseUrl,
	fetch: fetchImpl = fetch,
	workspaceId,
}: CreateHttpTransportOptions): Ha2haTransport => {
	const target = baseUrl.replace(TRAILING_SLASH_PATTERN, "");

	const request = async (
		url: string,
		init: RequestInit = {}
	): Promise<Response> => {
		const nextInit = authorizeRequest
			? ((await authorizeRequest({ init, url })) ?? init)
			: init;
		return fetchImpl(url, nextInit);
	};

	const readJson = async (response: Response): Promise<unknown> => {
		const text = await response.text();
		return text.length > 0 ? JSON.parse(text) : {};
	};

	const parseConflict = async (
		response: Response
	): Promise<Ha2haResult<never>> => {
		const body = await readJson(response);
		const result = ha2haConflictResponseSchema.safeParse(body);
		if (!result.success) {
			return err(
				"version_conflict",
				"Received an invalid HA2HA version conflict response.",
				{ status: response.status }
			);
		}
		return err("version_conflict", result.data.message, {
			latest: result.data.latest,
			status: response.status,
		});
	};

	return {
		deleteFile: async ({ actor, baseVersion, path: filePath }) => {
			const url = `${target}/api/workspaces/${encodeURIComponent(
				workspaceId
			)}/files?path=${encodeURIComponent(filePath)}`;
			const response = await request(url, {
				body: JSON.stringify({ actor, baseVersion }),
				headers: { "Content-Type": "application/json" },
				method: "DELETE",
			});
			if (response.status === 409) {
				return parseConflict(response);
			}
			if (!response.ok) {
				return responseError(response, "delete file");
			}
			const body = await readJson(response);
			return ok({
				deleted: true,
				deletedBy: getOptionalString(body, "deletedBy"),
				path: getString(body, "path", filePath),
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
		listWorkspace: async () => {
			const response = await request(
				`${target}/api/workspaces/${encodeURIComponent(workspaceId)}/tree`
			);
			if (!response.ok) {
				return responseError(response, "list workspace");
			}
			const body = await readJson(response);
			const record = getRecord(body);
			const rawFiles = record.files;
			const files = Array.isArray(rawFiles)
				? rawFiles
						.filter(isRecord)
						.map((file) => ({
							path: getString(file, "path", ""),
							version: getOptionalNumber(file, "version"),
						}))
						.filter((file) => file.path.length > 0)
				: [];
			return ok({
				files,
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
		readFile: async (filePath) => {
			const response = await request(
				`${target}/api/workspaces/${encodeURIComponent(
					workspaceId
				)}/files?path=${encodeURIComponent(filePath)}`
			);
			if (!response.ok) {
				return responseError(response, "read file");
			}
			const body = await readJson(response);
			return ok({
				content: getString(body, "content", ""),
				contentType: getString(body, "contentType", DEFAULT_CONTENT_TYPE),
				path: getString(body, "path", filePath),
				updatedBy: getOptionalString(body, "updatedBy"),
				version: getNumber(body, "version", 1),
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
		writeFile: async ({
			actor,
			baseVersion,
			content,
			contentType,
			path: filePath,
		}) => {
			const response = await request(
				`${target}/api/workspaces/${encodeURIComponent(workspaceId)}/files`,
				{
					body: JSON.stringify({
						actor,
						baseVersion,
						content,
						contentType: contentType ?? contentTypeForPath(filePath),
						path: filePath,
					}),
					headers: { "Content-Type": "application/json" },
					method: "PUT",
				}
			);
			if (response.status === 409) {
				return parseConflict(response);
			}
			if (!response.ok) {
				return responseError(response, "write file");
			}
			const body = await readJson(response);
			return ok({
				path: getString(body, "path", filePath),
				updatedBy: getOptionalString(body, "updatedBy"),
				version: getNumber(body, "version", 1),
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
	};
};

export interface CreateLocalFolderTransportOptions {
	rootDir: string;
	workspaceId?: string;
}

export const createLocalFolderTransport = ({
	rootDir,
	workspaceId,
}: CreateLocalFolderTransportOptions): Ha2haTransport => {
	const absoluteRoot = path.resolve(rootDir);

	const resolveWorkspaceId = async (): Promise<string> => {
		if (workspaceId) {
			return workspaceId;
		}
		const manifest = await readManifest(absoluteRoot);
		return manifest.workspaceId;
	};

	return {
		deleteFile: async ({ actor, baseVersion, path: filePath }) => {
			const pathError = validateWorkspacePath(filePath);
			if (pathError) {
				return errFromClientError(pathError);
			}
			const targetPath = path.join(absoluteRoot, filePath);
			const current = await readLocalCurrentFile({
				absoluteRoot,
				filePath,
				workspaceId: await resolveWorkspaceId(),
			});
			if (!current.ok) {
				return current;
			}
			if (baseVersion !== current.data.version) {
				return conflictFromFile(current.data);
			}
			await unlink(targetPath);
			await appendEvent(absoluteRoot, {
				actor,
				path: filePath,
				payload: { baseVersion },
				type: HA2HA_EVENT_TYPES.fileDeleted,
				version: current.data.version,
				workspaceId: current.data.workspaceId,
			});
			return ok({
				deleted: true,
				deletedBy: actor,
				path: filePath,
				workspaceId: current.data.workspaceId,
			});
		},
		listWorkspace: async () => {
			const resolvedWorkspaceId = await resolveWorkspaceId();
			const files = await listLocalFiles(absoluteRoot);
			const versions = await readFileVersions(absoluteRoot);
			return ok({
				files: files.map((filePath) => ({
					path: filePath,
					version: latestVersionForPath(versions, filePath) ?? 1,
				})),
				workspaceId: resolvedWorkspaceId,
			});
		},
		readFile: async (filePath) =>
			readLocalCurrentFile({
				absoluteRoot,
				filePath,
				workspaceId: await resolveWorkspaceId(),
			}),
		validateWorkspace: async () =>
			ok(await validateHa2haWorkspace(absoluteRoot)),
		writeFile: async ({
			actor,
			baseVersion,
			content,
			contentType,
			path: filePath,
		}) => {
			const pathError = validateWorkspacePath(filePath);
			if (pathError) {
				return errFromClientError(pathError);
			}
			const resolvedWorkspaceId = await resolveWorkspaceId();
			const targetPath = path.join(absoluteRoot, filePath);
			const existing = await readLocalCurrentFile({
				absoluteRoot,
				filePath,
				workspaceId: resolvedWorkspaceId,
			});
			if (existing.ok && baseVersion !== existing.data.version) {
				return conflictFromFile(existing.data);
			}
			if (!(existing.ok || baseVersion === null || baseVersion === undefined)) {
				return err(
					"version_conflict",
					"Cannot create a missing file with a baseVersion.",
					{
						latest: {
							path: filePath,
							version: 0,
							workspaceId: resolvedWorkspaceId,
						},
					}
				);
			}
			const nextVersion = existing.ok ? existing.data.version + 1 : 1;
			await mkdir(path.dirname(targetPath), { recursive: true });
			await writeFile(targetPath, content);
			const nextContentType = contentType ?? contentTypeForPath(filePath);
			await appendFileVersion(absoluteRoot, {
				contentType: nextContentType,
				createdAt: new Date().toISOString(),
				path: filePath,
				sha256: sha256(content),
				sizeBytes: Buffer.byteLength(content),
				updatedBy: actor,
				version: nextVersion,
				workspaceId: resolvedWorkspaceId,
			});
			await appendEvent(absoluteRoot, {
				actor,
				path: filePath,
				payload: { baseVersion: baseVersion ?? null },
				type: existing.ok
					? HA2HA_EVENT_TYPES.fileUpdated
					: HA2HA_EVENT_TYPES.fileCreated,
				version: nextVersion,
				workspaceId: resolvedWorkspaceId,
			});
			return ok({
				path: filePath,
				updatedBy: actor,
				version: nextVersion,
				workspaceId: resolvedWorkspaceId,
			});
		},
	};
};

const claimTask = async ({
	actor,
	input,
	transport,
	writeFileWithActor,
}: {
	actor: string;
	input: ClaimTaskInput;
	transport: Ha2haTransport;
	writeFileWithActor: (
		input: Omit<TransportWriteInput, "actor">
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}): Promise<Ha2haResult<Ha2haWriteResult>> => {
	const taskPath = input.path ?? `${HA2HA_PATHS.tasks}${input.taskId}.md`;
	const task = await transport.readFile(taskPath);
	if (!task.ok) {
		return task;
	}
	const parsed = parseMarkdownFrontmatter(task.data.content);
	if (!parsed.ok) {
		return parsed;
	}
	const owner = getNullableString(parsed.data.frontmatter, "owner");
	if (owner && owner !== actor) {
		return err(
			"task_owned",
			`Task ${input.taskId} is already owned by ${owner}.`
		);
	}
	const nextFrontmatter = {
		...parsed.data.frontmatter,
		owner: input.owner ?? actor,
		state: input.state ?? "claimed",
		updated_by: actor,
	};
	return writeFileWithActor({
		baseVersion: task.data.version,
		content: formatMarkdownFrontmatter(nextFrontmatter, parsed.data.body),
		contentType: task.data.contentType,
		path: taskPath,
	});
};

const addEvidence = async ({
	actor,
	clock,
	input,
	transport,
	writeFileWithActor,
}: {
	actor: string;
	clock: () => Date;
	input: AddEvidenceInput;
	transport: Ha2haTransport;
	writeFileWithActor: (
		input: Omit<TransportWriteInput, "actor">
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}): Promise<
	Ha2haResult<{ evidence: Ha2haWriteResult; task: Ha2haWriteResult }>
> => {
	const taskPath = `${HA2HA_PATHS.tasks}${input.taskId}.md`;
	const task = await transport.readFile(taskPath);
	if (!task.ok) {
		return task;
	}
	const evidencePath =
		input.evidencePath ??
		`${HA2HA_PATHS.evidence}${input.taskId}/${slug(input.kind)}.md`;
	const target =
		input.target ??
		({
			path: taskPath,
			version: task.data.version,
			workspaceId: task.data.workspaceId,
		} satisfies Ha2haTargetCoordinate);
	const evidence = await writeFileWithActor({
		content: formatMarkdownFrontmatter(
			{
				actor,
				created_at: clock().toISOString(),
				id: input.id ?? `ev-${input.taskId}-${slug(input.kind)}`,
				kind: input.kind,
				result: input.result,
				target,
				task: input.taskId,
			},
			input.body ?? `Evidence for ${input.taskId}.`
		),
		contentType: DEFAULT_CONTENT_TYPE,
		path: evidencePath,
	});
	if (!evidence.ok) {
		return evidence;
	}
	const parsed = parseMarkdownFrontmatter(task.data.content);
	if (!parsed.ok) {
		return parsed;
	}
	const currentEvidence = Array.isArray(parsed.data.frontmatter.evidence)
		? parsed.data.frontmatter.evidence.filter(
				(value): value is string => typeof value === "string"
			)
		: [];
	const nextEvidence = currentEvidence.includes(evidencePath)
		? currentEvidence
		: [...currentEvidence, evidencePath];
	const updatedTask = await writeFileWithActor({
		baseVersion: task.data.version,
		content: formatMarkdownFrontmatter(
			{
				...parsed.data.frontmatter,
				evidence: nextEvidence,
				updated_by: actor,
			},
			parsed.data.body
		),
		contentType: task.data.contentType,
		path: taskPath,
	});
	if (!updatedTask.ok) {
		return updatedTask;
	}
	return ok({ evidence: evidence.data, task: updatedTask.data });
};

const recordDecision = async ({
	clock,
	input,
	writeFileWithActor,
}: {
	clock: () => Date;
	input: RecordDecisionInput;
	writeFileWithActor: (
		input: Omit<TransportWriteInput, "actor">
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}) =>
	writeFileWithActor({
		content: `# ${input.title}\n\n${input.body.trim()}\n`,
		contentType: DEFAULT_CONTENT_TYPE,
		path:
			input.path ??
			`${HA2HA_PATHS.decisions}${clock().toISOString().slice(0, 10)}-${slug(
				input.title
			)}.md`,
	});

const writeHandoff = async ({
	clock,
	input,
	writeFileWithActor,
}: {
	clock: () => Date;
	input: WriteHandoffInput;
	writeFileWithActor: (
		input: Omit<TransportWriteInput, "actor">
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}) =>
	writeFileWithActor({
		content: `# Handoff${input.taskId ? ` For ${input.taskId}` : ""}\n\n${input.body.trim()}\n`,
		contentType: DEFAULT_CONTENT_TYPE,
		path:
			input.path ??
			`${HA2HA_PATHS.logs}${clock().toISOString().slice(0, 10)}-handoff.md`,
	});

const readManifest = async (absoluteRoot: string) => {
	const manifestPath = path.join(absoluteRoot, HA2HA_PATHS.workspaceManifest);
	const json = JSON.parse(await readFile(manifestPath, "utf8"));
	return ha2haWorkspaceManifestSchema.parse(json);
};

const readLocalCurrentFile = async ({
	absoluteRoot,
	filePath,
	workspaceId,
}: {
	absoluteRoot: string;
	filePath: string;
	workspaceId: string;
}): Promise<Ha2haResult<Ha2haFile>> => {
	const pathError = validateWorkspacePath(filePath);
	if (pathError) {
		return errFromClientError(pathError);
	}
	const targetPath = path.join(absoluteRoot, filePath);
	try {
		const content = await readFile(targetPath, "utf8");
		const versions = await readFileVersions(absoluteRoot);
		const latest = latestFileVersionForPath(versions, filePath);
		return ok({
			content,
			contentType: latest?.contentType ?? contentTypeForPath(filePath),
			path: filePath,
			updatedBy: latest?.updatedBy ?? null,
			version: latest?.version ?? 1,
			workspaceId,
		});
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return err("not_found", `Missing HA2HA file ${filePath}.`);
		}
		return err(
			"transport_error",
			`Failed to read ${filePath}: ${String(error)}`
		);
	}
};

const listLocalFiles = async (
	absoluteRoot: string,
	currentDir = absoluteRoot
): Promise<string[]> => {
	const entries = await readdir(currentDir);
	const files = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(currentDir, entry);
			const entryStat = await stat(entryPath);
			if (entryStat.isDirectory()) {
				return listLocalFiles(absoluteRoot, entryPath);
			}
			return [toWorkspacePath(absoluteRoot, entryPath)];
		})
	);
	return files.flat().sort((left, right) => left.localeCompare(right));
};

interface LocalFileVersion {
	contentType: string;
	createdAt: string;
	path: string;
	sha256: string;
	sizeBytes: number;
	updatedBy: string;
	version: number;
	workspaceId: string;
}

interface LocalEvent {
	actor: string;
	createdAt?: string;
	id?: string;
	path: string;
	payload: Record<string, unknown>;
	type: string;
	version: number;
	workspaceId: string;
}

const readFileVersions = async (
	absoluteRoot: string
): Promise<LocalFileVersion[]> =>
	readJsonArray(path.join(absoluteRoot, ".ha2ha", "file-versions.json"));

const appendFileVersion = async (
	absoluteRoot: string,
	fileVersion: LocalFileVersion
) => {
	const versions = await readFileVersions(absoluteRoot);
	versions.push(fileVersion);
	await writeJsonArray(
		path.join(absoluteRoot, ".ha2ha", "file-versions.json"),
		versions
	);
};

const appendEvent = async (absoluteRoot: string, event: LocalEvent) => {
	const eventsPath = path.join(absoluteRoot, ".ha2ha", "workspace-events.json");
	const events = await readJsonArray<LocalEvent>(eventsPath);
	events.push({
		...event,
		createdAt: event.createdAt ?? new Date().toISOString(),
		id: event.id ?? `evt-${events.length + 1}`,
	});
	await writeJsonArray(eventsPath, events);
};

const readJsonArray = async <Item>(filePath: string): Promise<Item[]> => {
	try {
		const value = JSON.parse(await readFile(filePath, "utf8"));
		return Array.isArray(value) ? (value as Item[]) : [];
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return [];
		}
		throw error;
	}
};

const writeJsonArray = async (filePath: string, values: unknown[]) => {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(
		filePath,
		`${JSON.stringify(values, null, JSON_INDENT_SPACES)}\n`
	);
};

const latestFileVersionForPath = (
	versions: LocalFileVersion[],
	filePath: string
) =>
	versions
		.filter((version) => version.path === filePath)
		.sort((left, right) => right.version - left.version)[0];

const latestVersionForPath = (versions: LocalFileVersion[], filePath: string) =>
	latestFileVersionForPath(versions, filePath)?.version;

const validateWorkspacePath = (filePath: string): Ha2haClientError | null => {
	const result = ha2haWorkspacePathSchema.safeParse(filePath);
	if (!result.success) {
		return {
			code: "validation_error",
			message: `Invalid HA2HA workspace path: ${filePath}`,
		};
	}
	return null;
};

const parseMarkdownFrontmatter = (
	content: string
): Ha2haResult<{ body: string; frontmatter: Record<string, unknown> }> => {
	const match = FRONTMATTER_PATTERN.exec(content);
	if (!match?.[1]) {
		return err("validation_error", "Expected YAML frontmatter.");
	}
	const parsed = parseYaml(match[1]);
	if (!isRecord(parsed)) {
		return err("validation_error", "Expected object YAML frontmatter.");
	}
	return ok({
		body: content.slice(match[0].length),
		frontmatter: parsed,
	});
};

const formatMarkdownFrontmatter = (
	frontmatter: Record<string, unknown>,
	body: string
) => `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n\n${body.trim()}\n`;

const conflictFromFile = (file: Ha2haFile): Ha2haResult<never> =>
	err("version_conflict", HA2HA_CONFLICT.message, {
		latest: {
			content: file.content,
			contentType: file.contentType,
			path: file.path,
			version: file.version,
			workspaceId: file.workspaceId,
		},
		status: 409,
	});

const responseError = async <Data>(
	response: Response,
	action: string
): Promise<Ha2haResult<Data>> => {
	let message = response.statusText;
	try {
		const body = await response.json();
		if (isRecord(body)) {
			message =
				getOptionalString(body, "message") ??
				getOptionalString(body, "error") ??
				message;
		}
	} catch {
		// Keep the status text when the body is not JSON.
	}
	return err("transport_error", `Failed to ${action}: ${message}`, {
		status: response.status,
	});
};

const contentTypeForPath = (filePath: string) =>
	MARKDOWN_EXTENSION_PATTERN.test(filePath)
		? DEFAULT_CONTENT_TYPE
		: "application/octet-stream";

const toWorkspacePath = (absoluteRoot: string, filePath: string) =>
	path.relative(absoluteRoot, filePath).split(path.sep).join("/");

const sha256 = (content: string) =>
	createHash("sha256").update(content).digest("hex");

const slug = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-|-$/gu, "")
		.slice(0, 80);

const ok = <Data>(data: Data): Ha2haResult<Data> => ({ data, ok: true });

const err = <Data>(
	code: Ha2haClientErrorCode,
	message: string,
	extra: Omit<Ha2haClientError, "code" | "message"> = {}
): Ha2haResult<Data> => ({
	error: { code, message, ...extra },
	ok: false,
});

const errFromClientError = <Data>(
	error: Ha2haClientError
): Ha2haResult<Data> => ({
	error,
	ok: false,
});

const getRecord = (value: unknown): Record<string, unknown> =>
	isRecord(value) ? value : {};

const getString = (value: unknown, key: string, fallback: string): string => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "string" ? candidate : fallback;
};

const getNullableString = (
	value: Record<string, unknown>,
	key: string
): string | null => {
	const candidate = value[key];
	return typeof candidate === "string" && candidate.length > 0
		? candidate
		: null;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
	error instanceof Error && "code" in error;

export const copyHa2haWorkspaceFixture = async ({
	from,
	to,
}: {
	from: string;
	to: string;
}) => {
	await rm(to, { force: true, recursive: true });
	await cp(from, to, { recursive: true });
};
