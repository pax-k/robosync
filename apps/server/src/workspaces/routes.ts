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
	getWorkspaceAdminStats,
	getWorkspaceComment,
	getWorkspaceFileVersion,
	listAllWorkspaceFileVersions,
	listWorkspaceAdminEvents,
	listWorkspaceComments,
	listWorkspaceEvents,
	listWorkspaceFiles,
	listWorkspaceFilesDetailed,
	listWorkspaceFileVersions,
	putFileObject,
	readObjectBody,
	recordWorkspaceAdminEvent,
	type WorkspaceAdminEventRow,
	type WorkspaceCommentRow,
	type WorkspaceEventRow,
	type WorkspaceFileRow,
	type WorkspaceFileVersionRow,
	type WorkspaceRow,
} from "./storage";

const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";
const WORKSPACE_EXPORT_FORMAT = "mdsync.workspace-export.v1";
const WORKSPACE_EXPORT_SCHEMA_VERSION = 1;
const INVALID_PERCENT_ESCAPE_PATTERN = /%(?![0-9A-Fa-f]{2})/;
const TRAILING_SLASH_PATTERN = /\/$/;
const VERSION_CONFLICT_ADMIN_EVENT_TYPE = "file.version_conflict";

const actorSchema = z.string().trim().min(1).max(120);
const jsonObjectSchema = z.record(z.string(), z.unknown());

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

const capabilityKindSchema = z.enum(["read", "edit"]);
const commentIdSchema = z.string().trim().min(1).max(160);
const commentSelectorSchema = z
	.object({
		heading: z.string().trim().min(1).max(200).optional(),
		line: z.number().int().positive().optional(),
	})
	.strict();
const createCommentSchema = z.object({
	actor: actorSchema,
	body: z.string().trim().min(1).max(4000),
	path: z.string(),
	selector: commentSelectorSchema.optional(),
	version: z.number().int().positive(),
});
const resolveCommentSchema = z.object({
	actor: actorSchema,
});
const exportWorkspaceSchema = z
	.object({
		adminEvents: z.array(
			z.object({
				actor: z.string().nullable(),
				createdAt: z.string().min(1),
				path: z.string().nullable(),
				payload: jsonObjectSchema,
				type: z.string().min(1),
			})
		),
		comments: z.array(
			z.object({
				anchor: jsonObjectSchema,
				authorId: z.string().nullable(),
				body: z.string(),
				createdAt: z.string().min(1),
				path: z.string(),
				resolvedAt: z.string().nullable(),
				resolvedBy: z.string().nullable(),
				updatedAt: z.string().min(1),
				version: z.number().int().positive(),
			})
		),
		events: z.array(
			z.object({
				actor: z.string().nullable(),
				createdAt: z.string().min(1),
				path: z.string().nullable(),
				payload: jsonObjectSchema,
				type: z.string().min(1),
				version: z.number().int().positive().nullable(),
			})
		),
		exportedAt: z.string().min(1),
		files: z
			.array(
				z.object({
					content: z.string(),
					contentType: z.string().min(1),
					createdAt: z.string().min(1),
					path: z.string(),
					updatedAt: z.string().min(1),
					updatedBy: z.string().nullable(),
					version: z.number().int().positive(),
				})
			)
			.min(1),
		fileVersions: z.array(
			z.object({
				content: z.string(),
				contentType: z.string().min(1),
				createdAt: z.string().min(1),
				path: z.string(),
				updatedBy: z.string().nullable(),
				version: z.number().int().positive(),
			})
		),
		format: z.literal(WORKSPACE_EXPORT_FORMAT),
		retention: z.unknown().optional(),
		schemaVersion: z.literal(WORKSPACE_EXPORT_SCHEMA_VERSION),
		workspace: z.object({
			createdAt: z.string().min(1),
			id: z.string().min(1),
			readAccess: z.enum(["public", "token"]),
			title: z.string().nullable(),
			totalSizeBytes: z.number().int().nonnegative(),
			updatedAt: z.string().min(1),
			writeAccess: z.enum(["none", "public", "token"]),
		}),
	})
	.strict();
const retentionPruneSchema = z.object({
	before: z.string().min(1),
	include: z
		.object({
			adminEvents: z.boolean().default(false),
			events: z.boolean().default(false),
			fileVersions: z.boolean().default(false),
			resolvedComments: z.boolean().default(false),
		})
		.default({
			adminEvents: false,
			events: false,
			fileVersions: false,
			resolvedComments: false,
		}),
	orphanedObjectKeys: z.array(z.string().min(1)).max(100).default([]),
});

type WorkspaceExportBundle = z.infer<typeof exportWorkspaceSchema>;
type ImportedCurrentFile = WorkspaceExportBundle["files"][number];
type ImportedFileVersion = WorkspaceExportBundle["fileVersions"][number];

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

workspaceRoutes.post("/api/workspaces/import", async (c) => {
	try {
		const bundle = exportWorkspaceSchema.parse(await c.req.json());
		return c.json(await importWorkspaceBundle(bundle, c.req.raw), 201);
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

workspaceRoutes.get("/api/workspaces/:workspaceId/admin/stats", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		return c.json(await getWorkspaceAdminStats(workspace));
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/api/workspaces/:workspaceId/export", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		return c.json(await exportWorkspaceBundle(workspace));
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.get("/api/workspaces/:workspaceId/retention", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		return c.json(buildRetentionPolicyPayload(workspace));
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.post(
	"/api/workspaces/:workspaceId/retention/prune",
	async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeWrite(workspace, c.req.raw);
			const parsed = retentionPruneSchema.parse(await c.req.json());
			const before = parseRetentionBefore(parsed.before);
			return c.json(
				await pruneWorkspaceRetention({
					before,
					include: parsed.include,
					orphanedObjectKeys: parsed.orphanedObjectKeys,
					workspace,
				})
			);
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	}
);

workspaceRoutes.get("/api/workspaces/:workspaceId/capabilities", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		return c.json({
			capabilities: serializeWorkspaceCapabilities(workspace),
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.post(
	"/api/workspaces/:workspaceId/capabilities/:capability/rotate",
	async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeWrite(workspace, c.req.raw);
			const capability = capabilityKindSchema.parse(c.req.param("capability"));
			const token = randomCapabilityToken();
			const now = new Date().toISOString();
			const hashedToken = await tokenHash(token);

			if (capability === "read") {
				await workspaceBindings()
					.DB.prepare(
						`update workspaces
             set read_access = 'token', read_token_hash = ?, updated_at = ?
             where id = ?`
					)
					.bind(hashedToken, now, workspace.id)
					.run();
				const latestWorkspace = await requireWorkspace(workspace.id);
				return c.json({
					capabilities: serializeWorkspaceCapabilities(latestWorkspace),
					capability,
					links: buildReadCapabilityLinks({
						origin: new URL(c.req.url).origin,
						readToken: token,
						webOrigin: workspaceBindings().WEB_ORIGIN,
						workspaceId: workspace.id,
					}),
					workspaceId: workspace.id,
				});
			}

			if (workspace.write_access === "none") {
				throw new WorkspaceError(
					403,
					"write_disabled",
					"Workspace edit capability is revoked."
				);
			}

			await workspaceBindings()
				.DB.prepare(
					`update workspaces
           set write_access = 'token', write_token_hash = ?, updated_at = ?
           where id = ?`
				)
				.bind(hashedToken, now, workspace.id)
				.run();
			const latestWorkspace = await requireWorkspace(workspace.id);
			return c.json({
				capabilities: serializeWorkspaceCapabilities(latestWorkspace),
				capability,
				links: buildEditCapabilityLinks({
					editToken: token,
					webOrigin: workspaceBindings().WEB_ORIGIN,
					workspaceId: workspace.id,
				}),
				workspaceId: workspace.id,
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	}
);

workspaceRoutes.post(
	"/api/workspaces/:workspaceId/capabilities/:capability/revoke",
	async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeWrite(workspace, c.req.raw);
			const capability = capabilityKindSchema.parse(c.req.param("capability"));
			const now = new Date().toISOString();

			if (capability === "read") {
				await workspaceBindings()
					.DB.prepare(
						`update workspaces
             set read_access = 'token', read_token_hash = null, updated_at = ?
             where id = ?`
					)
					.bind(now, workspace.id)
					.run();
			} else {
				await workspaceBindings()
					.DB.prepare(
						`update workspaces
             set write_access = 'none', write_token_hash = null, updated_at = ?
             where id = ?`
					)
					.bind(now, workspace.id)
					.run();
			}

			const latestWorkspace = await requireWorkspace(workspace.id);
			return c.json({
				capabilities: serializeWorkspaceCapabilities(latestWorkspace),
				capability,
				revoked: true,
				workspaceId: workspace.id,
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	}
);

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

workspaceRoutes.get("/api/workspaces/:workspaceId/comments", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeRead(workspace, c.req.raw);
		const pathQuery = c.req.query("path");
		const path = pathQuery ? normalizeFilePath(pathQuery) : undefined;
		const comments = await listWorkspaceComments({
			path,
			workspaceId: workspace.id,
		});

		return c.json({
			comments: comments.map(serializeWorkspaceComment),
			workspaceId: workspace.id,
		});
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.post("/api/workspaces/:workspaceId/comments", async (c) => {
	try {
		const workspace = await requireWorkspace(c.req.param("workspaceId"));
		await authorizeWrite(workspace, c.req.raw);
		const parsed = createCommentSchema.parse(await c.req.json());
		const path = normalizeFilePath(parsed.path);
		const fileVersion = await getWorkspaceFileVersion({
			path,
			version: parsed.version,
			workspaceId: workspace.id,
		});

		if (!fileVersion) {
			throw new WorkspaceError(
				404,
				"comment_anchor_not_found",
				"Comment anchor file version not found."
			);
		}

		const now = new Date().toISOString();
		const id = crypto.randomUUID();
		await workspaceBindings()
			.DB.prepare(
				`insert into comments (
          id, workspace_id, path, version, anchor_json, body, author_id,
          created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				id,
				workspace.id,
				path,
				parsed.version,
				JSON.stringify(parsed.selector ?? {}),
				parsed.body,
				parsed.actor,
				now,
				now
			)
			.run();

		const comment = await requireComment(workspace.id, id);
		return c.json(serializeWorkspaceComment(comment), 201);
	} catch (error) {
		return handleWorkspaceError(c, error);
	}
});

workspaceRoutes.post(
	"/api/workspaces/:workspaceId/comments/:commentId/resolve",
	async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeWrite(workspace, c.req.raw);
			const commentId = commentIdSchema.parse(c.req.param("commentId"));
			const parsed = resolveCommentSchema.parse(await c.req.json());
			const existing = await requireComment(workspace.id, commentId);

			if (!existing.resolved_at) {
				const now = new Date().toISOString();
				await workspaceBindings()
					.DB.prepare(
						`update comments
             set resolved_at = ?, resolved_by = ?, updated_at = ?
             where workspace_id = ? and id = ?`
					)
					.bind(now, parsed.actor, now, workspace.id, commentId)
					.run();
			}

			const comment = await requireComment(workspace.id, commentId);
			return c.json(serializeWorkspaceComment(comment));
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
			await recordVersionConflict({
				actor: parsed.actor,
				baseVersion: parsed.baseVersion,
				operation: "create",
				path,
				workspaceId: workspace.id,
			});
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
				await recordVersionConflict({
					actor: parsed.actor,
					baseVersion: parsed.baseVersion ?? null,
					operation: "update",
					path,
					workspaceId: workspace.id,
				});
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
			await recordVersionConflict({
				actor: parsed.actor,
				baseVersion: parsed.baseVersion ?? null,
				operation: "create",
				path,
				workspaceId: workspace.id,
			});
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
			await recordVersionConflict({
				actor: parsed.actor,
				baseVersion: parsed.baseVersion,
				operation: "delete",
				path,
				workspaceId: workspace.id,
			});
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

async function exportWorkspaceBundle(workspace: WorkspaceRow) {
	const [files, fileVersions, events, comments, adminEvents] =
		await Promise.all([
			listWorkspaceFilesDetailed(workspace.id),
			listAllWorkspaceFileVersions(workspace.id),
			listWorkspaceEvents(workspace.id),
			listWorkspaceComments({ workspaceId: workspace.id }),
			listWorkspaceAdminEvents(workspace.id),
		]);

	return {
		adminEvents: adminEvents.map(serializeWorkspaceAdminEventForExport),
		comments: comments.map(serializeWorkspaceCommentForExport),
		events: events.map(serializeWorkspaceEventForExport),
		exportedAt: new Date().toISOString(),
		files: await Promise.all(files.map(serializeWorkspaceFileForExport)),
		fileVersions: await Promise.all(
			fileVersions.map(serializeWorkspaceFileVersionForExport)
		),
		format: WORKSPACE_EXPORT_FORMAT,
		retention: buildRetentionPolicyPayload(workspace).retention,
		schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
		workspace: {
			createdAt: workspace.created_at,
			id: workspace.id,
			readAccess: workspace.read_access,
			title: workspace.title,
			totalSizeBytes: workspace.total_size_bytes,
			updatedAt: workspace.updated_at,
			writeAccess: workspace.write_access,
		},
	};
}

async function importWorkspaceBundle(
	bundle: WorkspaceExportBundle,
	request: Request
) {
	const id = createWorkspaceId();
	const now = new Date().toISOString();
	const r2Prefix = createR2Prefix(id);
	const readToken = randomCapabilityToken();
	const editToken = randomCapabilityToken();
	const readTokenHash = await tokenHash(readToken);
	const writeTokenHash = await tokenHash(editToken);
	const files = bundle.files.map((file) => ({
		...file,
		path: normalizeFilePath(file.path),
	}));
	const fileVersions = normalizeImportedFileVersions({
		files,
		versions: bundle.fileVersions,
	});
	validateUniquePaths(files.map((file) => file.path));
	validateUniqueFileVersions(fileVersions);

	const { currentUploads, versionUploads } =
		await uploadImportedWorkspaceObjects({
			files,
			fileVersions,
			workspaceId: id,
		});

	try {
		const totalSizeBytes = currentUploads.reduce(
			(total, file) => total + file.sizeBytes,
			0
		);
		await workspaceBindings().DB.batch([
			workspaceBindings()
				.DB.prepare(
					`insert into workspaces (
            id, title, read_access, write_access, read_token_hash, write_token_hash, r2_prefix,
            file_count, total_size_bytes, created_at, updated_at, last_accessed_at
          ) values (?, ?, 'token', 'token', ?, ?, ?, ?, ?, ?, ?, null)`
				)
				.bind(
					id,
					bundle.workspace.title,
					readTokenHash,
					writeTokenHash,
					r2Prefix,
					currentUploads.length,
					totalSizeBytes,
					now,
					now
				),
			...files.map((file, index) => {
				const uploaded = requiredUploadedObject(currentUploads, index);
				return workspaceBindings()
					.DB.prepare(
						`insert into workspace_files (
              workspace_id, path, object_key, content_type, size_bytes, sha256, version,
              updated_by, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						id,
						file.path,
						uploaded.objectKey,
						file.contentType,
						uploaded.sizeBytes,
						uploaded.sha256,
						file.version,
						file.updatedBy,
						file.createdAt,
						file.updatedAt
					);
			}),
			...fileVersions.map((fileVersion, index) => {
				const uploaded = requiredUploadedObject(versionUploads, index);
				return createFileVersionStatement({
					contentType: fileVersion.contentType,
					createdAt: fileVersion.createdAt,
					objectKey: uploaded.objectKey,
					path: fileVersion.path,
					sha256: uploaded.sha256,
					sizeBytes: uploaded.sizeBytes,
					updatedBy: fileVersion.updatedBy,
					version: fileVersion.version,
					workspaceId: id,
				});
			}),
			...bundle.events.map((event) =>
				createWorkspaceEventStatement({
					actor: event.actor,
					createdAt: event.createdAt,
					path: normalizeNullableFilePath(event.path),
					payload: event.payload,
					type: event.type,
					version: event.version,
					workspaceId: id,
				})
			),
			...bundle.comments.map((comment) =>
				createWorkspaceCommentStatement({
					...comment,
					path: normalizeFilePath(comment.path),
					workspaceId: id,
				})
			),
			...bundle.adminEvents.map((event) =>
				createWorkspaceAdminEventStatement({
					actor: event.actor,
					createdAt: event.createdAt,
					path: normalizeNullableFilePath(event.path),
					payload: event.payload,
					type: event.type,
					workspaceId: id,
				})
			),
		]);
	} catch (error) {
		await cleanupUploadedObjects(currentUploads.concat(versionUploads));
		throw error;
	}

	return {
		id,
		importedAt: now,
		importedCounts: {
			adminEvents: bundle.adminEvents.length,
			comments: bundle.comments.length,
			events: bundle.events.length,
			files: files.length,
			fileVersions: fileVersions.length,
		},
		sourceWorkspaceId: bundle.workspace.id,
		title: bundle.workspace.title,
		...buildWorkspaceUrls({
			editToken,
			id,
			origin: new URL(request.url).origin,
			readAccess: "token",
			readToken,
			webOrigin: workspaceBindings().WEB_ORIGIN,
			writeAccess: "token",
		}),
	};
}

async function uploadImportedWorkspaceObjects({
	files,
	fileVersions,
	workspaceId,
}: {
	files: ImportedCurrentFile[];
	fileVersions: ImportedFileVersion[];
	workspaceId: string;
}) {
	const descriptors = [
		...files.map((file) => ({ file, kind: "current" as const })),
		...fileVersions.map((file) => ({ file, kind: "version" as const })),
	];
	const uploadResults = await Promise.allSettled(
		descriptors.map(({ file }) =>
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

	const currentUploads: UploadedObject[] = [];
	const versionUploads: UploadedObject[] = [];
	for (const [index, result] of uploadResults.entries()) {
		if (result.status !== "fulfilled") {
			continue;
		}
		if (descriptors[index]?.kind === "current") {
			currentUploads.push(result.value);
		} else {
			versionUploads.push(result.value);
		}
	}

	return { currentUploads, versionUploads };
}

function normalizeImportedFileVersions({
	files,
	versions,
}: {
	files: ImportedCurrentFile[];
	versions: ImportedFileVersion[];
}) {
	const normalizedVersions = versions.map((fileVersion) => ({
		...fileVersion,
		path: normalizeFilePath(fileVersion.path),
	}));
	const versionKeys = new Set(
		normalizedVersions.map((fileVersion) => fileVersionKey(fileVersion))
	);

	for (const file of files) {
		const key = fileVersionKey(file);
		if (versionKeys.has(key)) {
			continue;
		}
		normalizedVersions.push({
			content: file.content,
			contentType: file.contentType,
			createdAt: file.updatedAt,
			path: file.path,
			updatedBy: file.updatedBy,
			version: file.version,
		});
		versionKeys.add(key);
	}

	return normalizedVersions;
}

function validateUniqueFileVersions(fileVersions: ImportedFileVersion[]) {
	const seen = new Set<string>();
	for (const fileVersion of fileVersions) {
		const key = fileVersionKey(fileVersion);
		if (seen.has(key)) {
			throw new WorkspaceError(
				400,
				"duplicate_file_version",
				`Duplicate file version: ${fileVersion.path}@${fileVersion.version}`
			);
		}
		seen.add(key);
	}
}

function fileVersionKey(fileVersion: { path: string; version: number }) {
	return `${fileVersion.path}\u0000${fileVersion.version}`;
}

function normalizeNullableFilePath(path: string | null) {
	return path === null ? null : normalizeFilePath(path);
}

function requiredUploadedObject(files: UploadedObject[], index: number) {
	const file = files[index];
	if (!file) {
		throw new WorkspaceError(
			500,
			"missing_uploaded_object",
			"Imported file upload result is missing."
		);
	}
	return file;
}

async function serializeWorkspaceFileForExport(file: WorkspaceFileRow) {
	return {
		content: await fetchObjectText(file),
		contentType: file.content_type,
		createdAt: file.created_at,
		path: file.path,
		updatedAt: file.updated_at,
		updatedBy: file.updated_by,
		version: file.version,
	};
}

async function serializeWorkspaceFileVersionForExport(
	fileVersion: WorkspaceFileVersionRow
) {
	return {
		content: await fetchObjectTextByKey(fileVersion.object_key),
		contentType: fileVersion.content_type,
		createdAt: fileVersion.created_at,
		path: fileVersion.path,
		updatedBy: fileVersion.updated_by,
		version: fileVersion.version,
	};
}

function serializeWorkspaceEventForExport(event: WorkspaceEventRow) {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		path: event.path,
		payload: parseEventPayload(event.payload),
		type: event.type,
		version: event.version,
	};
}

function serializeWorkspaceCommentForExport(comment: WorkspaceCommentRow) {
	return {
		anchor: parseEventPayload(comment.anchor_json),
		authorId: comment.author_id,
		body: comment.body,
		createdAt: comment.created_at,
		path: comment.path,
		resolvedAt: comment.resolved_at,
		resolvedBy: comment.resolved_by,
		updatedAt: comment.updated_at,
		version: comment.version,
	};
}

function serializeWorkspaceAdminEventForExport(event: WorkspaceAdminEventRow) {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		path: event.path,
		payload: parseEventPayload(event.payload),
		type: event.type,
	};
}

function buildRetentionPolicyPayload(workspace: WorkspaceRow) {
	return {
		generatedAt: new Date().toISOString(),
		retention: {
			cleanup: {
				orphanedObjects: {
					mode: "explicit_scoped_keys",
					r2Prefix: workspace.r2_prefix,
				},
			},
			coverage: [
				"workspaces",
				"file versions",
				"protocol events",
				"comments",
				"admin events",
				"orphaned objects",
			],
			defaults: {
				adminEvents: "manual prune by created_at",
				comments: "manual prune for resolved comments only",
				events: "manual prune by created_at",
				fileVersions:
					"manual prune except current or comment-anchored versions",
				orphanedObjects: "manual explicit-key cleanup within workspace prefix",
				workspaces: "workspace metadata cascades through D1 relationships",
			},
			perWorkspaceD1: {
				reason:
					"No isolation or scale evidence currently justifies per-workspace D1.",
				status: "deferred",
			},
			status: "manual",
		},
		workspaceId: workspace.id,
	};
}

async function pruneWorkspaceRetention({
	before,
	include,
	orphanedObjectKeys,
	workspace,
}: {
	before: string;
	include: z.infer<typeof retentionPruneSchema>["include"];
	orphanedObjectKeys: string[];
	workspace: WorkspaceRow;
}) {
	const resolvedComments = include.resolvedComments
		? await deleteExpiredResolvedComments(workspace.id, before)
		: 0;
	const fileVersionPrune = include.fileVersions
		? await deleteExpiredFileVersions(workspace.id, before)
		: { objectKeysDeleted: 0, rowsDeleted: 0 };
	const events = include.events
		? await deleteExpiredRows({
				before,
				table: "workspace_events",
				workspaceId: workspace.id,
			})
		: 0;
	const adminEvents = include.adminEvents
		? await deleteExpiredRows({
				before,
				table: "workspace_admin_events",
				workspaceId: workspace.id,
			})
		: 0;
	const orphanedObjects = await deleteExplicitWorkspaceObjects({
		objectKeys: orphanedObjectKeys,
		workspace,
	});

	return {
		before,
		pruned: {
			adminEvents,
			events,
			fileVersionObjects: fileVersionPrune.objectKeysDeleted,
			fileVersions: fileVersionPrune.rowsDeleted,
			orphanedObjects: orphanedObjects.deleted,
			resolvedComments,
		},
		skipped: {
			orphanedObjects: orphanedObjects.skipped,
		},
		workspaceId: workspace.id,
	};
}

function parseRetentionBefore(value: string) {
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) {
		throw new WorkspaceError(
			400,
			"invalid_retention_cutoff",
			"Retention cutoff must be an ISO-compatible timestamp."
		);
	}
	return new Date(timestamp).toISOString();
}

async function deleteExpiredResolvedComments(
	workspaceId: string,
	before: string
) {
	const result = await workspaceBindings()
		.DB.prepare(
			`delete from comments
       where workspace_id = ? and resolved_at is not null and updated_at < ?`
		)
		.bind(workspaceId, before)
		.run();
	return result.meta.changes ?? 0;
}

async function deleteExpiredRows({
	before,
	table,
	workspaceId,
}: {
	before: string;
	table: "workspace_admin_events" | "workspace_events";
	workspaceId: string;
}) {
	const result = await workspaceBindings()
		.DB.prepare(
			`delete from ${table} where workspace_id = ? and created_at < ?`
		)
		.bind(workspaceId, before)
		.run();
	return result.meta.changes ?? 0;
}

async function deleteExpiredFileVersions(workspaceId: string, before: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select v.object_key
       from workspace_file_versions v
       where v.workspace_id = ?
         and v.created_at < ?
         and not exists (
           select 1
           from workspace_files f
           where f.workspace_id = v.workspace_id
             and f.path = v.path
             and f.version = v.version
         )
         and not exists (
           select 1
           from comments c
           where c.workspace_id = v.workspace_id
             and c.path = v.path
             and c.version = v.version
         )`
		)
		.bind(workspaceId, before)
		.all<{ object_key: string }>();
	const objectKeys = [...new Set(results.map((row) => row.object_key))];
	const result = await workspaceBindings()
		.DB.prepare(
			`delete from workspace_file_versions
       where workspace_id = ?
         and created_at < ?
         and not exists (
           select 1
           from workspace_files f
           where f.workspace_id = workspace_file_versions.workspace_id
             and f.path = workspace_file_versions.path
             and f.version = workspace_file_versions.version
         )
         and not exists (
           select 1
           from comments c
           where c.workspace_id = workspace_file_versions.workspace_id
             and c.path = workspace_file_versions.path
             and c.version = workspace_file_versions.version
         )`
		)
		.bind(workspaceId, before)
		.run();

	await Promise.all(
		objectKeys.map((objectKey) => deleteObjectBestEffort(objectKey))
	);

	return {
		objectKeysDeleted: objectKeys.length,
		rowsDeleted: result.meta.changes ?? 0,
	};
}

async function deleteExplicitWorkspaceObjects({
	objectKeys,
	workspace,
}: {
	objectKeys: string[];
	workspace: WorkspaceRow;
}) {
	let skipped = 0;
	const seen = new Set<string>();
	const scopedObjectKeys: string[] = [];

	for (const objectKey of objectKeys) {
		if (seen.has(objectKey)) {
			continue;
		}
		seen.add(objectKey);

		if (!isWorkspaceObjectKey(workspace, objectKey)) {
			skipped += 1;
			continue;
		}

		scopedObjectKeys.push(objectKey);
	}

	await Promise.all(
		scopedObjectKeys.map((objectKey) => deleteObjectBestEffort(objectKey))
	);

	return { deleted: scopedObjectKeys.length, skipped };
}

function isWorkspaceObjectKey(workspace: WorkspaceRow, objectKey: string) {
	return objectKey.startsWith(`${workspace.r2_prefix}/`);
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

async function requireComment(workspaceId: string, commentId: string) {
	const comment = await getWorkspaceComment({ commentId, workspaceId });
	if (!comment) {
		throw new WorkspaceError(404, "comment_not_found", "Comment not found.");
	}
	return comment;
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

function serializeWorkspaceCapabilities(workspace: WorkspaceRow) {
	return {
		edit: {
			access: workspace.write_access,
			canRevoke: workspace.write_access !== "none",
			canRotate: workspace.write_access !== "none",
			tokenActive: Boolean(workspace.write_token_hash),
		},
		read: {
			access: workspace.read_access,
			canRevoke:
				workspace.read_access === "token" && Boolean(workspace.read_token_hash),
			canRotate: true,
			tokenActive: Boolean(workspace.read_token_hash),
		},
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

function serializeWorkspaceComment(comment: WorkspaceCommentRow) {
	return {
		anchor: parseEventPayload(comment.anchor_json),
		authorId: comment.author_id,
		body: comment.body,
		createdAt: comment.created_at,
		id: comment.id,
		path: comment.path,
		resolvedAt: comment.resolved_at,
		resolvedBy: comment.resolved_by,
		updatedAt: comment.updated_at,
		version: comment.version,
		workspaceId: comment.workspace_id,
	};
}

async function serializeHistoricalFile(fileVersion: WorkspaceFileVersionRow) {
	return {
		...serializeFileVersionMetadata(fileVersion),
		content: await fetchObjectTextByKey(fileVersion.object_key),
	};
}

function buildReadCapabilityLinks({
	origin,
	readToken,
	webOrigin,
	workspaceId,
}: {
	origin: string;
	readToken: string;
	webOrigin?: string | null;
	workspaceId: string;
}) {
	const apiOrigin = withoutTrailingSlash(origin);
	const workspaceOrigin = withoutTrailingSlash(webOrigin ?? origin);
	const query = `?k=${encodeURIComponent(readToken)}`;
	return {
		rawUrl: `${apiOrigin}/w/${workspaceId}/raw${query}`,
		workspaceUrl: `${workspaceOrigin}/w/${workspaceId}${query}`,
	};
}

function buildEditCapabilityLinks({
	editToken,
	webOrigin,
	workspaceId,
}: {
	editToken: string;
	webOrigin?: string | null;
	workspaceId: string;
}) {
	const workspaceOrigin = withoutTrailingSlash(webOrigin ?? "");
	return {
		editUrl: `${workspaceOrigin}/w/${workspaceId}?edit=${encodeURIComponent(editToken)}`,
	};
}

function withoutTrailingSlash(value: string) {
	return value.replace(TRAILING_SLASH_PATTERN, "");
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

function createWorkspaceCommentStatement({
	anchor,
	authorId,
	body,
	createdAt,
	path,
	resolvedAt,
	resolvedBy,
	updatedAt,
	version,
	workspaceId,
}: {
	anchor: Record<string, unknown>;
	authorId: string | null;
	body: string;
	createdAt: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt: string;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert into comments (
      id, workspace_id, path, version, anchor_json, body, author_id,
      created_at, updated_at, resolved_at, resolved_by
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			path,
			version,
			JSON.stringify(anchor),
			body,
			authorId,
			createdAt,
			updatedAt,
			resolvedAt,
			resolvedBy
		);
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
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	version: number | null;
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

function createWorkspaceAdminEventStatement({
	actor,
	createdAt,
	path,
	payload,
	type,
	workspaceId,
}: {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert into workspace_admin_events (
      id, workspace_id, type, path, actor, payload, created_at
    ) values (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			type,
			path,
			actor,
			JSON.stringify(payload),
			createdAt
		);
}

async function recordVersionConflict({
	actor,
	baseVersion,
	operation,
	path,
	workspaceId,
}: {
	actor: string | null;
	baseVersion: number | null;
	operation: "create" | "delete" | "update";
	path: string;
	workspaceId: string;
}) {
	const latest = await getFile(workspaceId, path);
	await recordWorkspaceAdminEvent({
		actor,
		path,
		payload: {
			baseVersion,
			latestVersion: latest?.version ?? null,
			operation,
		},
		type: VERSION_CONFLICT_ADMIN_EVENT_TYPE,
		workspaceId,
	});
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
