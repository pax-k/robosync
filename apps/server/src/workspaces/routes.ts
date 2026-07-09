import {
	createWorkspaceRequestSchema,
	deleteWorkspaceFileRequestSchema,
	updateWorkspaceFileRequestSchema,
	workspaceExportBundleSchema,
	workspaceRetentionPruneRequestSchema,
} from "@mdsync/contracts/workspaces";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { workspaceBindings } from "./bindings";
import {
	assertValidAccess,
	buildWorkspaceUrls,
	createR2Prefix,
	createWorkspaceId,
	normalizeFilePath,
	randomCapabilityToken,
	tokenHash,
	validateUniquePaths,
	WorkspaceError,
} from "./domain";
import {
	authorizeRead,
	authorizeWrite,
	buildRetentionPolicyPayload,
	cleanupUploadedObjects,
	exportWorkspaceBundle,
	handleWorkspaceError,
	importWorkspaceBundle,
	normalizeContentType,
	parseOptionalJson,
	parseRetentionBefore,
	pruneWorkspaceRetention,
	recordVersionConflict,
	requireFile,
	requireWorkspace,
	serializeFileVersionMetadata,
	serializeHistoricalFile,
	serializeWorkspace,
	serializeWorkspaceEvent,
	uploadWorkspaceObjects,
	versionConflictPayload,
} from "./route-support";
import { registerCapabilityRoutes } from "./routes/capabilities";
import { registerCommentRoutes } from "./routes/comments";
import { registerRawRoutes } from "./routes/raw";
import {
	appendDeletedWorkspaceFileRecords,
	appendUpdatedWorkspaceFileRecords,
	createCurrentWorkspaceFile,
	createWorkspaceRecords,
	deleteCurrentWorkspaceFile,
	deleteObjectBestEffort,
	fetchObjectText,
	getFile,
	getWorkspaceAdminStats,
	getWorkspaceFileVersion,
	listWorkspaceEvents,
	listWorkspaceFiles,
	listWorkspaceFileVersions,
	putFileObject,
	updateCurrentWorkspaceFile,
	updateWorkspaceTotals,
} from "./storage";

export const workspaceRoutes = new Hono<EvlogVariables>();

workspaceRoutes.post("/api/workspaces", async (c) => {
	try {
		const parsed = createWorkspaceRequestSchema.parse(await c.req.json());
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
			await createWorkspaceRecords({
				actor,
				createdAt: now,
				files: uploadedObjects,
				r2Prefix,
				readAccess: parsed.readAccess,
				readTokenHash,
				title: parsed.title ?? null,
				totalSizeBytes,
				updatedAt: now,
				workspaceId: id,
				writeAccess: parsed.writeAccess,
				writeTokenHash,
			});
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
		const bundle = workspaceExportBundleSchema.parse(await c.req.json());
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
			const parsed = workspaceRetentionPruneRequestSchema.parse(
				await c.req.json()
			);
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

registerCapabilityRoutes(workspaceRoutes);

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

registerCommentRoutes(workspaceRoutes);

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
		const parsed = updateWorkspaceFileRequestSchema.parse(await c.req.json());
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
			const { baseVersion } = parsed;
			if (typeof baseVersion !== "number") {
				throw new WorkspaceError(
					400,
					"missing_base_version",
					"baseVersion is required."
				);
			}
			const changedRows = await updateCurrentWorkspaceFile({
				actor: parsed.actor,
				baseVersion,
				now,
				path,
				uploaded,
				workspaceId: workspace.id,
			});

			if (changedRows === 0) {
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
			await appendUpdatedWorkspaceFileRecords({
				actor: parsed.actor,
				current,
				now,
				path,
				uploaded,
				workspaceId: workspace.id,
			});
			return c.json({
				path,
				updatedAt: now,
				updatedBy: parsed.actor,
				version: current.version + 1,
				workspaceId: workspace.id,
			});
		}

		try {
			await createCurrentWorkspaceFile({
				actor: parsed.actor,
				now,
				path,
				uploaded,
				workspaceId: workspace.id,
			});
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
		const parsed = deleteWorkspaceFileRequestSchema.parse(
			await parseOptionalJson(c.req.raw)
		);
		const current = await requireFile(workspace.id, path);
		const now = new Date().toISOString();
		const changedRows = await deleteCurrentWorkspaceFile({
			baseVersion: parsed.baseVersion,
			path,
			workspaceId: workspace.id,
		});

		if (changedRows === 0) {
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
		await appendDeletedWorkspaceFileRecords({
			actor: parsed.actor,
			current,
			now,
			workspaceId: workspace.id,
		});

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

registerRawRoutes(workspaceRoutes);
