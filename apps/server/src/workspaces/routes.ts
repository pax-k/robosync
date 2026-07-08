import {
	HA2HA_CONFLICT,
	HA2HA_EVENT_TYPES,
	HA2HA_HEADERS,
} from "@mdsync/ha2ha-protocol";
import type { EvlogVariables } from "evlog/hono";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { workspaceBindings } from "./bindings";
import {
	assertValidAccess,
	buildWorkspaceUrls,
	createR2Prefix,
	createWorkspaceId,
	extractBearerToken,
	formatRawListing,
	normalizeFilePath,
	randomCapabilityToken,
	tokenHash,
	type UploadedObject,
	validateUniquePaths,
	WorkspaceError,
} from "./domain";
import {
	deleteObjectBestEffort,
	fetchObjectText,
	fetchObjectTextByKey,
	getFile,
	getWorkspace,
	getWorkspaceFileVersion,
	listWorkspaceEvents,
	listWorkspaceFiles,
	listWorkspaceFileVersions,
	putFileObject,
	readObjectBody,
	type WorkspaceEventRow,
	type WorkspaceFileRow,
	type WorkspaceFileVersionRow,
	type WorkspaceRow,
} from "./storage";

const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";
const INVALID_PERCENT_ESCAPE_PATTERN = /%(?![0-9A-Fa-f]{2})/;

const actorSchema = z.string().trim().min(1).max(120);

const createWorkspaceSchema = z.object({
	actor: actorSchema.optional(),
	files: z
		.array(
			z.object({
				content: z.string(),
				contentType: z.string().min(1).optional(),
				path: z.string(),
			})
		)
		.min(1),
	readAccess: z.enum(["public", "token"]).default("token"),
	title: z.string().min(1).max(200).optional(),
	writeAccess: z.enum(["none", "public", "token"]).default("token"),
});

const updateFileSchema = z.object({
	actor: actorSchema,
	baseVersion: z.number().int().positive().nullable().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
	path: z.string(),
});

const deleteFileSchema = z.object({
	actor: actorSchema,
	baseVersion: z.number().int().positive(),
});

export const workspaceRoutes = new Hono<EvlogVariables>();

workspaceRoutes.post("/api/workspaces", async (c) => {
	try {
		const parsed = createWorkspaceSchema.parse(await c.req.json());
		assertValidAccess(parsed.readAccess, parsed.writeAccess);

		const actor = parsed.actor ?? "workspace-create";
		const id = createWorkspaceId();
		const now = new Date().toISOString();
		const r2Prefix = createR2Prefix(id);
		const readToken =
			parsed.readAccess === "token" ? randomCapabilityToken() : null;
		const writeToken =
			parsed.writeAccess === "token" ? randomCapabilityToken() : null;
		const readTokenHash = readToken ? await tokenHash(readToken) : null;
		const writeTokenHash = writeToken ? await tokenHash(writeToken) : null;
		const normalizedFiles = parsed.files.map((file) => ({
			content: file.content,
			contentType: normalizeContentType(file.contentType),
			path: normalizeFilePath(file.path),
		}));

		validateUniquePaths(normalizedFiles.map((file) => file.path));

		const uploadedObjects = await uploadWorkspaceObjects(normalizedFiles, id);
		try {
			const totalSizeBytes = uploadedObjects.reduce(
				(total, file) => total + file.sizeBytes,
				0
			);
			await workspaceBindings().DB.batch([
				workspaceBindings()
					.DB.prepare(
						`insert into workspaces (
            id, title, read_access, write_access, read_token_hash, write_token_hash, r2_prefix,
            file_count, total_size_bytes, created_at, updated_at, last_accessed_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)`
					)
					.bind(
						id,
						parsed.title ?? null,
						parsed.readAccess,
						parsed.writeAccess,
						readTokenHash,
						writeTokenHash,
						r2Prefix,
						uploadedObjects.length,
						totalSizeBytes,
						now,
						now
					),
				...uploadedObjects.map((file) =>
					workspaceBindings()
						.DB.prepare(
							`insert into workspace_files (
              workspace_id, path, object_key, content_type, size_bytes, sha256, version,
              updated_by, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
						)
						.bind(
							id,
							file.path,
							file.objectKey,
							file.contentType,
							file.sizeBytes,
							file.sha256,
							actor,
							now,
							now
						)
				),
				...uploadedObjects.map((file) =>
					createFileVersionStatement({
						contentType: file.contentType,
						createdAt: now,
						objectKey: file.objectKey,
						path: file.path,
						sha256: file.sha256,
						sizeBytes: file.sizeBytes,
						updatedBy: actor,
						version: 1,
						workspaceId: id,
					})
				),
				...uploadedObjects.map((file) =>
					createWorkspaceEventStatement({
						actor,
						createdAt: now,
						path: file.path,
						payload: { sizeBytes: file.sizeBytes },
						type: HA2HA_EVENT_TYPES.fileCreated,
						version: 1,
						workspaceId: id,
					})
				),
			]);
		} catch (error) {
			await cleanupUploadedObjects(uploadedObjects);
			throw error;
		}

		return c.json(
			{
				createdAt: now,
				id,
				title: parsed.title ?? null,
				...buildWorkspaceUrls({
					editToken: writeToken,
					id,
					origin: new URL(c.req.url).origin,
					readAccess: parsed.readAccess,
					readToken,
					webOrigin: workspaceBindings().WEB_ORIGIN,
					writeAccess: parsed.writeAccess,
				}),
			},
			201
		);
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/api/workspaces/:workspaceId", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		return c.json(serializeWorkspace(workspace));
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/api/workspaces/:workspaceId/tree", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		return c.json({
			files: await listWorkspaceFiles(workspace.id),
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/api/workspaces/:workspaceId/events", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		const events = await listWorkspaceEvents(workspace.id);
		return c.json({
			events: events.map(serializeWorkspaceEvent),
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get(
	"/api/workspaces/:workspaceId/files/versions",
	async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeRead(workspace, c.req.raw);
			const path = normalizeFilePath(c.req.query("path") ?? "");
			const versions = await listWorkspaceFileVersions(workspace.id, path);
			return c.json({
				path,
				versions: versions.map(serializeFileVersionMetadata),
				workspaceId: workspace.id,
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	}
);

workspaceRoutes.get(
	"/api/workspaces/:workspaceId/files/versions/:version",
	async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeRead(workspace, c.req.raw);
			const path = normalizeFilePath(c.req.query("path") ?? "");
			const version = Number(c.req.param("version"));
			if (!(Number.isInteger(version) && version > 0)) {
				throw new WorkspaceError(
					400,
					"invalid_version",
					"File version must be a positive integer."
				);
			}
			const fileVersion = await getWorkspaceFileVersion({
				path,
				version,
				workspaceId: workspace.id,
			});
			if (!fileVersion) {
				throw new WorkspaceError(
					404,
					"file_version_not_found",
					"File version not found."
				);
			}
			return c.json(await serializeHistoricalFile(fileVersion));
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	}
);

workspaceRoutes.get("/api/workspaces/:workspaceId/files", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		const path = normalizeFilePath(c.req.query("path") ?? "");
		const file = await requireFile(workspace.id, path);
		return c.json({
			content: await fetchObjectText(file),
			contentType: file.content_type,
			path: file.path,
			updatedAt: file.updated_at,
			updatedBy: file.updated_by,
			version: file.version,
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.put("/api/workspaces/:workspaceId/files", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		const parsed = updateFileSchema.parse(await c.req.json());
		const path = normalizeFilePath(parsed.path);
		const now = new Date().toISOString();
		const current = await getFile(workspace.id, path);
		const contentType = normalizeContentType(parsed.contentType);

		if (current && !parsed.baseVersion) {
			throw new WorkspaceError(
				400,
				"missing_base_version",
				"baseVersion is required."
			);
		}
		if (!current && parsed.baseVersion) {
			throw new WorkspaceError(
				409,
				"version_conflict",
				"File already changed."
			);
		}

		const uploaded = await putFileObject({
			content: parsed.content,
			contentType,
			path,
			workspaceId: workspace.id,
		});

		if (current) {
			const result = await workspaceBindings()
				.DB.prepare(
					`update workspace_files
         set object_key = ?, content_type = ?, size_bytes = ?, sha256 = ?,
             version = version + 1, updated_by = ?, updated_at = ?
         where workspace_id = ? and path = ? and version = ?`
				)
				.bind(
					uploaded.objectKey,
					uploaded.contentType,
					uploaded.sizeBytes,
					uploaded.sha256,
					parsed.actor,
					now,
					workspace.id,
					path,
					parsed.baseVersion
				)
				.run();

			if ((result.meta.changes ?? 0) === 0) {
				await deleteObjectBestEffort(uploaded.objectKey);
				return c.json(await versionConflictPayload(workspace.id, path), 409);
			}

			await updateWorkspaceTotals({
				fileCountDelta: 0,
				now,
				sizeDelta: uploaded.sizeBytes - current.size_bytes,
				workspaceId: workspace.id,
			});
			await workspaceBindings().DB.batch([
				createFileVersionStatementFromRow(current),
				createFileVersionStatement({
					contentType: uploaded.contentType,
					createdAt: now,
					objectKey: uploaded.objectKey,
					path,
					sha256: uploaded.sha256,
					sizeBytes: uploaded.sizeBytes,
					updatedBy: parsed.actor,
					version: current.version + 1,
					workspaceId: workspace.id,
				}),
				createWorkspaceEventStatement({
					actor: parsed.actor,
					createdAt: now,
					path,
					payload: { baseVersion: parsed.baseVersion },
					type: HA2HA_EVENT_TYPES.fileUpdated,
					version: current.version + 1,
					workspaceId: workspace.id,
				}),
			]);
			return c.json({
				path,
				updatedAt: now,
				updatedBy: parsed.actor,
				version: current.version + 1,
				workspaceId: workspace.id,
			});
		}

		try {
			await workspaceBindings().DB.batch([
				workspaceBindings()
					.DB.prepare(
						`insert into workspace_files (
          workspace_id, path, object_key, content_type, size_bytes, sha256, version,
          updated_by, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
					)
					.bind(
						workspace.id,
						path,
						uploaded.objectKey,
						uploaded.contentType,
						uploaded.sizeBytes,
						uploaded.sha256,
						parsed.actor,
						now,
						now
					),
				createFileVersionStatement({
					contentType: uploaded.contentType,
					createdAt: now,
					objectKey: uploaded.objectKey,
					path,
					sha256: uploaded.sha256,
					sizeBytes: uploaded.sizeBytes,
					updatedBy: parsed.actor,
					version: 1,
					workspaceId: workspace.id,
				}),
				createWorkspaceEventStatement({
					actor: parsed.actor,
					createdAt: now,
					path,
					payload: { baseVersion: null },
					type: HA2HA_EVENT_TYPES.fileCreated,
					version: 1,
					workspaceId: workspace.id,
				}),
			]);
		} catch {
			await deleteObjectBestEffort(uploaded.objectKey);
			return c.json(await versionConflictPayload(workspace.id, path), 409);
		}

		await updateWorkspaceTotals({
			fileCountDelta: 1,
			now,
			sizeDelta: uploaded.sizeBytes,
			workspaceId: workspace.id,
		});
		return c.json({
			path,
			updatedAt: now,
			updatedBy: parsed.actor,
			version: 1,
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.delete("/api/workspaces/:workspaceId/files", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		const path = normalizeFilePath(c.req.query("path") ?? "");
		const parsed = deleteFileSchema.parse(await parseOptionalJson(c.req.raw));
		const current = await requireFile(workspace.id, path);
		const now = new Date().toISOString();
		const result = await workspaceBindings()
			.DB.prepare(
				"delete from workspace_files where workspace_id = ? and path = ? and version = ?"
			)
			.bind(workspace.id, path, parsed.baseVersion)
			.run();

		if ((result.meta.changes ?? 0) === 0) {
			return c.json(await versionConflictPayload(workspace.id, path), 409);
		}

		await updateWorkspaceTotals({
			fileCountDelta: -1,
			now,
			sizeDelta: -current.size_bytes,
			workspaceId: workspace.id,
		});
		await workspaceBindings().DB.batch([
			createFileVersionStatementFromRow(current),
			createWorkspaceEventStatement({
				actor: parsed.actor,
				createdAt: now,
				path,
				payload: { baseVersion: parsed.baseVersion },
				type: HA2HA_EVENT_TYPES.fileDeleted,
				version: current.version,
				workspaceId: workspace.id,
			}),
		]);

		return c.json({
			deleted: true,
			deletedBy: parsed.actor,
			path,
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/w/:workspaceId/raw", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		const files = await listWorkspaceFiles(workspace.id);
		return c.text(
			formatRawListing({
				files: files.map((file) => file.path),
				id: workspace.id,
				title: workspace.title,
				updatedAt: workspace.updated_at,
			}),
			200,
			{
				"Content-Type": "text/plain; charset=utf-8",
			}
		);
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/w/:workspaceId/raw/events", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		const events = await listWorkspaceEvents(workspace.id);
		return c.json({
			events: events.map(serializeWorkspaceEvent),
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/w/:workspaceId/raw/*", async (c) => {
	try {
		const workspaceId = c.req.param("workspaceId");
		const workspace = await requireWorkspace(workspaceId);
		await authorizeRead(workspace, c.req.raw);
		const path = normalizeFilePath(
			rawFilePathFromRequest(workspaceId, c.req.raw)
		);
		const file = await requireFile(workspace.id, path);
		const body = await readObjectBody(file);

		return new Response(body, {
			headers: {
				"Content-Type": file.content_type,
				ETag: `"${file.version}"`,
				[HA2HA_HEADERS.fileVersion]: String(file.version),
				[HA2HA_HEADERS.path]: file.path,
			},
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

async function authorizeRead(workspace: WorkspaceRow, request: Request) {
	if (workspace.read_access === "public") {
		return;
	}

	const url = new URL(request.url);
	const readToken = url.searchParams.get("k");
	const editToken =
		url.searchParams.get("edit") ??
		extractBearerToken(request.headers.get("Authorization"));

	if (!(readToken || editToken)) {
		throw new WorkspaceError(401, "missing_token", "Read token is required.");
	}

	const readTokenMatches =
		readToken &&
		workspace.read_token_hash &&
		(await tokenHash(readToken)) === workspace.read_token_hash;
	const editTokenMatches =
		editToken &&
		workspace.write_token_hash &&
		(await tokenHash(editToken)) === workspace.write_token_hash;

	if (!(readTokenMatches || editTokenMatches)) {
		throw new WorkspaceError(403, "invalid_token", "Read token is invalid.");
	}
}

async function authorizeWrite(workspace: WorkspaceRow, request: Request) {
	if (workspace.write_access === "none") {
		throw new WorkspaceError(403, "write_disabled", "Workspace is read-only.");
	}
	if (workspace.write_access === "public") {
		return;
	}

	const url = new URL(request.url);
	const token =
		extractBearerToken(request.headers.get("Authorization")) ??
		url.searchParams.get("edit");

	if (!token) {
		throw new WorkspaceError(401, "missing_token", "Write token is required.");
	}
	if (
		!workspace.write_token_hash ||
		(await tokenHash(token)) !== workspace.write_token_hash
	) {
		throw new WorkspaceError(403, "invalid_token", "Write token is invalid.");
	}
}

async function cleanupUploadedObjects(files: UploadedObject[]) {
	await Promise.all(
		files.map((file) => deleteObjectBestEffort(file.objectKey))
	);
}

function handleWorkspaceError(c: Context, error: unknown) {
	if (error instanceof WorkspaceError) {
		return c.json(
			{
				error: error.code,
				message: error.message,
			},
			error.status
		);
	}
	if (error instanceof z.ZodError) {
		return c.json(
			{
				error: "invalid_request",
				issues: error.issues,
				message: "Request validation failed.",
			},
			400
		);
	}
	throw error;
}

function normalizeContentType(contentType?: string) {
	return contentType ?? DEFAULT_CONTENT_TYPE;
}

function parseOptionalJson(request: Request) {
	const contentType = request.headers.get("Content-Type");
	if (!contentType?.includes("application/json")) {
		return {};
	}
	return request.json();
}

function rawFilePathFromRequest(workspaceId: string, request: Request) {
	const { pathname } = new URL(request.url);
	const prefix = `/w/${workspaceId}/raw/`;
	if (!pathname.startsWith(prefix)) {
		throw new WorkspaceError(400, "invalid_path", "Raw file path is invalid.");
	}

	const encodedPath = pathname.slice(prefix.length);
	if (INVALID_PERCENT_ESCAPE_PATTERN.test(encodedPath)) {
		throw new WorkspaceError(400, "invalid_path", "Raw file path is invalid.");
	}

	return decodeURIComponent(encodedPath);
}

async function requireFile(workspaceId: string, path: string) {
	const file = await getFile(workspaceId, path);
	if (!file) {
		throw new WorkspaceError(404, "file_not_found", "File not found.");
	}
	return file;
}

async function requireWorkspace(workspaceId: string) {
	const workspace = await getWorkspace(workspaceId);
	if (!workspace) {
		throw new WorkspaceError(
			404,
			"workspace_not_found",
			"Workspace not found."
		);
	}
	return workspace;
}

function serializeWorkspace(workspace: WorkspaceRow) {
	return {
		createdAt: workspace.created_at,
		id: workspace.id,
		readAccess: workspace.read_access,
		title: workspace.title,
		updatedAt: workspace.updated_at,
		writeAccess: workspace.write_access,
	};
}

function serializeWorkspaceEvent(event: WorkspaceEventRow) {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		id: event.id,
		path: event.path,
		payload: parseEventPayload(event.payload),
		type: event.type,
		version: event.version,
		workspaceId: event.workspace_id,
	};
}

function serializeFileVersionMetadata(fileVersion: WorkspaceFileVersionRow) {
	return {
		contentType: fileVersion.content_type,
		createdAt: fileVersion.created_at,
		path: fileVersion.path,
		sha256: fileVersion.sha256,
		sizeBytes: fileVersion.size_bytes,
		updatedBy: fileVersion.updated_by,
		version: fileVersion.version,
		workspaceId: fileVersion.workspace_id,
	};
}

async function serializeHistoricalFile(fileVersion: WorkspaceFileVersionRow) {
	return {
		...serializeFileVersionMetadata(fileVersion),
		content: await fetchObjectTextByKey(fileVersion.object_key),
	};
}

function parseEventPayload(payload: string) {
	try {
		const parsed: unknown = JSON.parse(payload);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

async function updateWorkspaceTotals({
	fileCountDelta,
	now,
	sizeDelta,
	workspaceId,
}: {
	fileCountDelta: number;
	now: string;
	sizeDelta: number;
	workspaceId: string;
}) {
	await workspaceBindings()
		.DB.prepare(
			`update workspaces
     set file_count = file_count + ?, total_size_bytes = total_size_bytes + ?, updated_at = ?
     where id = ?`
		)
		.bind(fileCountDelta, sizeDelta, now, workspaceId)
		.run();
}

function createFileVersionStatement({
	contentType,
	createdAt,
	objectKey,
	path,
	sha256,
	sizeBytes,
	updatedBy,
	version,
	workspaceId,
}: {
	contentType: string;
	createdAt: string;
	objectKey: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert or ignore into workspace_file_versions (
      workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			workspaceId,
			path,
			version,
			objectKey,
			contentType,
			sizeBytes,
			sha256,
			updatedBy,
			createdAt
		);
}

function createFileVersionStatementFromRow(file: WorkspaceFileRow) {
	return createFileVersionStatement({
		contentType: file.content_type,
		createdAt: file.updated_at,
		objectKey: file.object_key,
		path: file.path,
		sha256: file.sha256,
		sizeBytes: file.size_bytes,
		updatedBy: file.updated_by,
		version: file.version,
		workspaceId: file.workspace_id,
	});
}

function createWorkspaceEventStatement({
	actor,
	createdAt,
	path,
	payload,
	type,
	version,
	workspaceId,
}: {
	actor: string | null;
	createdAt: string;
	path: string;
	payload: Record<string, unknown>;
	type: string;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert into workspace_events (
      id, workspace_id, type, path, version, actor, created_at, payload
    ) values (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			type,
			path,
			version,
			actor,
			createdAt,
			JSON.stringify(payload)
		);
}

async function versionConflictPayload(workspaceId: string, path: string) {
	const latest = await getFile(workspaceId, path);
	return {
		error: HA2HA_CONFLICT.error,
		latest: latest ? await serializeLatestConflictFile(latest) : null,
		message: HA2HA_CONFLICT.message,
	};
}

async function serializeLatestConflictFile(file: WorkspaceFileRow) {
	return {
		content: await fetchObjectText(file),
		contentType: file.content_type,
		path: file.path,
		updatedAt: file.updated_at,
		updatedBy: file.updated_by,
		version: file.version,
		workspaceId: file.workspace_id,
	};
}

async function uploadWorkspaceObjects(
	files: Array<{ content: string; contentType: string; path: string }>,
	workspaceId: string
) {
	const uploadResults = await Promise.allSettled(
		files.map((file) =>
			putFileObject({
				content: file.content,
				contentType: file.contentType,
				path: file.path,
				workspaceId,
			})
		)
	);
	const uploadedObjects = uploadResults.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : []
	);
	const failedUpload = uploadResults.find(
		(result): result is PromiseRejectedResult => result.status === "rejected"
	);

	if (failedUpload) {
		await cleanupUploadedObjects(uploadedObjects);
		throw failedUpload.reason;
	}

	return uploadedObjects;
}
