import { z } from "zod";

export const WORKSPACE_EXPORT_FORMAT = "mdsync.workspace-export.v1";
export const WORKSPACE_EXPORT_SCHEMA_VERSION = 1;

export const workspaceReadAccessSchema = z.enum(["public", "token"]);
export const workspaceWriteAccessSchema = z.enum(["none", "public", "token"]);
export const workspaceCapabilityKindSchema = z.enum(["read", "edit"]);
export const workspaceActorSchema = z.string().trim().min(1).max(120);
export const workspaceJsonObjectSchema = z.record(z.string(), z.unknown());
export const workspaceTimestampSchema = z.string().trim().min(1);

export const workspaceFileInputSchema = z
	.object({
		content: z.string(),
		contentType: z.string().trim().min(1).optional(),
		path: z.string(),
	})
	.strict();

export const createWorkspaceRequestSchema = z
	.object({
		actor: workspaceActorSchema.optional(),
		files: z.array(workspaceFileInputSchema).min(1),
		readAccess: workspaceReadAccessSchema.default("token"),
		title: z.string().trim().min(1).max(200).optional(),
		writeAccess: workspaceWriteAccessSchema.default("token"),
	})
	.strict();

export const updateWorkspaceFileRequestSchema = z
	.object({
		actor: workspaceActorSchema,
		baseVersion: z.number().int().positive().nullable().optional(),
		content: z.string(),
		contentType: z.string().trim().min(1).optional(),
		path: z.string(),
	})
	.strict();

export const deleteWorkspaceFileRequestSchema = z
	.object({
		actor: workspaceActorSchema,
		baseVersion: z.number().int().positive(),
	})
	.strict();

export const workspaceCommentSelectorSchema = z
	.object({
		heading: z.string().trim().min(1).max(200).optional(),
		line: z.number().int().positive().optional(),
	})
	.strict();

export const createWorkspaceCommentRequestSchema = z
	.object({
		actor: workspaceActorSchema,
		body: z.string().trim().min(1).max(4000),
		path: z.string(),
		selector: workspaceCommentSelectorSchema.optional(),
		version: z.number().int().positive(),
	})
	.strict();

export const resolveWorkspaceCommentRequestSchema = z
	.object({
		actor: workspaceActorSchema,
	})
	.strict();

export const workspaceRetentionPruneRequestSchema = z
	.object({
		before: workspaceTimestampSchema,
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
		orphanedObjectKeys: z.array(z.string().trim().min(1)).max(100).default([]),
	})
	.strict();

export const workspaceMetadataSchema = z
	.object({
		createdAt: workspaceTimestampSchema,
		id: z.string().trim().min(1),
		readAccess: workspaceReadAccessSchema,
		title: z.string().nullable(),
		updatedAt: workspaceTimestampSchema,
		writeAccess: workspaceWriteAccessSchema,
	})
	.strict();

export const createdWorkspaceResponseSchema = z
	.object({
		createdAt: workspaceTimestampSchema.optional(),
		editUrl: z.string().trim().min(1).optional(),
		id: z.string().trim().min(1),
		rawUrl: z.string().trim().min(1),
		title: z.string().nullable().optional(),
		workspaceUrl: z.string().trim().min(1),
	})
	.strict();

export const workspaceTreeFileSchema = z
	.object({
		contentType: z.string().trim().min(1),
		path: z.string().trim().min(1),
		updatedAt: workspaceTimestampSchema,
		updatedBy: z.string().nullable(),
		version: z.number().int().positive(),
	})
	.strict();

export const workspaceTreeResponseSchema = z
	.object({
		files: z.array(workspaceTreeFileSchema),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceFileResponseSchema = z
	.object({
		content: z.string(),
		contentType: z.string().trim().min(1),
		path: z.string().trim().min(1),
		updatedAt: workspaceTimestampSchema,
		updatedBy: z.string().nullable(),
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceFileWriteResponseSchema = z
	.object({
		path: z.string().trim().min(1),
		updatedAt: workspaceTimestampSchema.optional(),
		updatedBy: z.string().nullable().optional(),
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceFileDeleteResponseSchema = z
	.object({
		deleted: z.literal(true),
		deletedBy: z.string().nullable().optional(),
		path: z.string().trim().min(1),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceFileVersionMetadataSchema = z
	.object({
		contentType: z.string().trim().min(1),
		createdAt: workspaceTimestampSchema,
		path: z.string().trim().min(1),
		sha256: z.string().nullable(),
		sizeBytes: z.number().int().nonnegative(),
		updatedBy: z.string().nullable(),
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceFileVersionsResponseSchema = z
	.object({
		path: z.string().trim().min(1),
		versions: z.array(workspaceFileVersionMetadataSchema),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const historicalWorkspaceFileResponseSchema =
	workspaceFileVersionMetadataSchema.extend({
		content: z.string(),
	});

export const workspaceEventSchema = z
	.object({
		actor: z.string().nullable(),
		createdAt: workspaceTimestampSchema,
		id: z.string().trim().min(1),
		path: z.string().nullable(),
		payload: workspaceJsonObjectSchema,
		type: z.string().trim().min(1),
		version: z.number().int().positive().nullable(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceEventsResponseSchema = z
	.object({
		events: z.array(workspaceEventSchema),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceCommentSchema = z
	.object({
		anchor: workspaceJsonObjectSchema,
		authorId: z.string().nullable(),
		body: z.string(),
		createdAt: workspaceTimestampSchema,
		id: z.string().trim().min(1),
		path: z.string().trim().min(1),
		resolvedAt: z.string().nullable(),
		resolvedBy: z.string().nullable(),
		updatedAt: workspaceTimestampSchema,
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceCommentsResponseSchema = z
	.object({
		comments: z.array(workspaceCommentSchema),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceCapabilityStateSchema = z
	.object({
		access: z.union([workspaceReadAccessSchema, workspaceWriteAccessSchema]),
		canRevoke: z.boolean(),
		canRotate: z.boolean(),
		tokenActive: z.boolean(),
	})
	.strict();

export const workspaceCapabilitiesSchema = z
	.object({
		edit: workspaceCapabilityStateSchema,
		read: workspaceCapabilityStateSchema,
	})
	.strict();

export const workspaceCapabilitiesResponseSchema = z
	.object({
		capabilities: workspaceCapabilitiesSchema,
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceCapabilityLinksSchema = z
	.object({
		editUrl: z.string().trim().min(1).optional(),
		rawUrl: z.string().trim().min(1).optional(),
		workspaceUrl: z.string().trim().min(1).optional(),
	})
	.strict();

export const workspaceCapabilityMutationResponseSchema =
	workspaceCapabilitiesResponseSchema.extend({
		capability: workspaceCapabilityKindSchema,
		links: workspaceCapabilityLinksSchema.optional(),
		revoked: z.boolean().optional(),
	});

export const workspaceAdminEventSchema = z
	.object({
		actor: z.string().nullable(),
		createdAt: workspaceTimestampSchema,
		path: z.string().nullable(),
		payload: workspaceJsonObjectSchema,
		type: z.string().trim().min(1),
	})
	.strict();

export const workspaceProtocolEventSummarySchema =
	workspaceAdminEventSchema.extend({
		version: z.number().int().positive().nullable(),
	});

export const workspaceNamedCountSchema = z
	.object({
		count: z.number().int().nonnegative(),
		name: z.string(),
	})
	.strict();

export const workspaceAdminStatsSchema = z
	.object({
		cleanup: z
			.object({
				failedJobs: z.number().int().nonnegative(),
				latestFailureAt: z.string().nullable(),
				orphanedObjects: z
					.object({
						count: z.number().int().nonnegative().nullable(),
						status: z.literal("not_scanned"),
					})
					.strict(),
			})
			.strict(),
		comments: z
			.object({
				resolved: z.number().int().nonnegative(),
				staleAnchors: z.number().int().nonnegative(),
				total: z.number().int().nonnegative(),
				unresolved: z.number().int().nonnegative(),
			})
			.strict(),
		conflicts: z
			.object({
				recent: z.array(workspaceAdminEventSchema),
				total: z.number().int().nonnegative(),
			})
			.strict(),
		events: z
			.object({
				byType: z.array(workspaceNamedCountSchema),
				recent: z.array(workspaceProtocolEventSummarySchema),
				total: z.number().int().nonnegative(),
			})
			.strict(),
		files: z
			.object({
				currentCount: z.number().int().nonnegative(),
				latestUpdatedAt: z.string().nullable(),
				totalSizeBytes: z.number().int().nonnegative(),
			})
			.strict(),
		generatedAt: workspaceTimestampSchema,
		health: z
			.object({
				issues: z.array(z.string()),
				status: z.enum(["attention", "healthy"]),
			})
			.strict(),
		retention: z
			.object({
				coverage: z.array(z.string()),
				status: z.literal("not_configured"),
			})
			.strict(),
		storage: z
			.object({
				activeBytes: z.number().int().nonnegative(),
				currentFileRecords: z.number().int().nonnegative(),
				indexedObjects: z.number().int().nonnegative(),
				r2Prefix: z.string(),
				versionBytes: z.number().int().nonnegative(),
				versionRecords: z.number().int().nonnegative(),
			})
			.strict(),
		tasks: z
			.object({
				byState: z.array(workspaceNamedCountSchema),
				files: z.array(
					z
						.object({
							path: z.string(),
							state: z.string().nullable(),
							version: z.number().int().positive(),
						})
						.strict()
				),
				missingState: z.number().int().nonnegative(),
				total: z.number().int().nonnegative(),
			})
			.strict(),
		versions: z
			.object({
				pathsWithHistory: z.number().int().nonnegative(),
				totalCount: z.number().int().nonnegative(),
			})
			.strict(),
		workspace: workspaceMetadataSchema.extend({
			fileCount: z.number().int().nonnegative(),
			lastAccessedAt: z.string().nullable(),
			totalSizeBytes: z.number().int().nonnegative(),
		}),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceExportEventSchema = workspaceAdminEventSchema.extend({
	version: z.number().int().positive().nullable(),
});

export const workspaceExportCommentSchema = z
	.object({
		anchor: workspaceJsonObjectSchema,
		authorId: z.string().nullable(),
		body: z.string(),
		createdAt: workspaceTimestampSchema,
		path: z.string().trim().min(1),
		resolvedAt: z.string().nullable(),
		resolvedBy: z.string().nullable(),
		updatedAt: workspaceTimestampSchema,
		version: z.number().int().positive(),
	})
	.strict();

export const workspaceExportFileSchema = z
	.object({
		content: z.string(),
		contentType: z.string().trim().min(1),
		createdAt: workspaceTimestampSchema,
		path: z.string().trim().min(1),
		updatedAt: workspaceTimestampSchema,
		updatedBy: z.string().nullable(),
		version: z.number().int().positive(),
	})
	.strict();

export const workspaceExportFileVersionSchema = z
	.object({
		content: z.string(),
		contentType: z.string().trim().min(1),
		createdAt: workspaceTimestampSchema,
		path: z.string().trim().min(1),
		updatedBy: z.string().nullable(),
		version: z.number().int().positive(),
	})
	.strict();

export const workspaceExportBundleSchema = z
	.object({
		adminEvents: z.array(workspaceAdminEventSchema),
		comments: z.array(workspaceExportCommentSchema),
		events: z.array(workspaceExportEventSchema),
		exportedAt: workspaceTimestampSchema,
		files: z.array(workspaceExportFileSchema).min(1),
		fileVersions: z.array(workspaceExportFileVersionSchema),
		format: z.literal(WORKSPACE_EXPORT_FORMAT),
		retention: z.unknown().optional(),
		schemaVersion: z.literal(WORKSPACE_EXPORT_SCHEMA_VERSION),
		workspace: z
			.object({
				createdAt: workspaceTimestampSchema,
				id: z.string().trim().min(1),
				readAccess: workspaceReadAccessSchema,
				title: z.string().nullable(),
				totalSizeBytes: z.number().int().nonnegative(),
				updatedAt: workspaceTimestampSchema,
				writeAccess: workspaceWriteAccessSchema,
			})
			.strict(),
	})
	.strict();

export const importedWorkspaceResponseSchema = createdWorkspaceResponseSchema
	.extend({
		importedAt: workspaceTimestampSchema.optional(),
		importedCounts: z
			.object({
				adminEvents: z.number().int().nonnegative(),
				comments: z.number().int().nonnegative(),
				events: z.number().int().nonnegative(),
				files: z.number().int().nonnegative(),
				fileVersions: z.number().int().nonnegative(),
			})
			.strict(),
		sourceWorkspaceId: z.string().trim().min(1).optional(),
	})
	.strict();

export const workspaceRetentionPolicySchema = z
	.object({
		cleanup: z
			.object({
				orphanedObjects: z
					.object({
						mode: z.literal("explicit_scoped_keys"),
						r2Prefix: z.string(),
					})
					.strict(),
			})
			.strict()
			.optional(),
		coverage: z.array(z.string()),
		defaults: z.record(z.string(), z.string()).optional(),
		perWorkspaceD1: z
			.object({
				reason: z.string().optional(),
				status: z.string(),
			})
			.strict(),
		status: z.string(),
	})
	.strict();

export const workspaceRetentionPolicyResponseSchema = z
	.object({
		generatedAt: workspaceTimestampSchema.optional(),
		retention: workspaceRetentionPolicySchema,
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceRetentionPruneResponseSchema = z
	.object({
		before: workspaceTimestampSchema.optional(),
		pruned: z.record(z.string(), z.number().int().nonnegative()),
		skipped: z.record(z.string(), z.number().int().nonnegative()).optional(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const workspaceVersionConflictResponseSchema = z
	.object({
		error: z.literal("version_conflict"),
		latest: workspaceFileResponseSchema.nullable(),
		message: z.string().trim().min(1),
	})
	.strict();

export type WorkspaceReadAccess = z.infer<typeof workspaceReadAccessSchema>;
export type WorkspaceWriteAccess = z.infer<typeof workspaceWriteAccessSchema>;
export type WorkspaceCapabilityKind = z.infer<
	typeof workspaceCapabilityKindSchema
>;
export type CreateWorkspaceRequest = z.infer<
	typeof createWorkspaceRequestSchema
>;
export type UpdateWorkspaceFileRequest = z.infer<
	typeof updateWorkspaceFileRequestSchema
>;
export type DeleteWorkspaceFileRequest = z.infer<
	typeof deleteWorkspaceFileRequestSchema
>;
export type CreateWorkspaceCommentRequest = z.infer<
	typeof createWorkspaceCommentRequestSchema
>;
export type ResolveWorkspaceCommentRequest = z.infer<
	typeof resolveWorkspaceCommentRequestSchema
>;
export type WorkspaceRetentionPruneRequest = z.infer<
	typeof workspaceRetentionPruneRequestSchema
>;
export type WorkspaceMetadata = z.infer<typeof workspaceMetadataSchema>;
export type CreatedWorkspaceResponse = z.infer<
	typeof createdWorkspaceResponseSchema
>;
export type WorkspaceTreeFile = z.infer<typeof workspaceTreeFileSchema>;
export type WorkspaceTreeResponse = z.infer<typeof workspaceTreeResponseSchema>;
export type WorkspaceFileResponse = z.infer<typeof workspaceFileResponseSchema>;
export type WorkspaceFileWriteResponse = z.infer<
	typeof workspaceFileWriteResponseSchema
>;
export type WorkspaceFileDeleteResponse = z.infer<
	typeof workspaceFileDeleteResponseSchema
>;
export type WorkspaceFileVersionMetadata = z.infer<
	typeof workspaceFileVersionMetadataSchema
>;
export type HistoricalWorkspaceFileResponse = z.infer<
	typeof historicalWorkspaceFileResponseSchema
>;
export type WorkspaceEvent = z.infer<typeof workspaceEventSchema>;
export type WorkspaceEventsResponse = z.infer<
	typeof workspaceEventsResponseSchema
>;
export type WorkspaceComment = z.infer<typeof workspaceCommentSchema>;
export type WorkspaceCommentsResponse = z.infer<
	typeof workspaceCommentsResponseSchema
>;
export type WorkspaceFileVersionsResponse = z.infer<
	typeof workspaceFileVersionsResponseSchema
>;
export type WorkspaceCapabilities = z.infer<typeof workspaceCapabilitiesSchema>;
export type WorkspaceCapabilitiesResponse = z.infer<
	typeof workspaceCapabilitiesResponseSchema
>;
export type WorkspaceCapabilityMutationResponse = z.infer<
	typeof workspaceCapabilityMutationResponseSchema
>;
export type WorkspaceAdminStats = z.infer<typeof workspaceAdminStatsSchema>;
export type WorkspaceAdminEvent = z.infer<typeof workspaceAdminEventSchema>;
export type WorkspaceProtocolEventSummary = z.infer<
	typeof workspaceProtocolEventSummarySchema
>;
export type WorkspaceNamedCount = z.infer<typeof workspaceNamedCountSchema>;
export type WorkspaceExportBundle = z.infer<typeof workspaceExportBundleSchema>;
export type ImportedWorkspaceResponse = z.infer<
	typeof importedWorkspaceResponseSchema
>;
export type WorkspaceRetentionPolicyResponse = z.infer<
	typeof workspaceRetentionPolicyResponseSchema
>;
export type WorkspaceRetentionPruneResponse = z.infer<
	typeof workspaceRetentionPruneResponseSchema
>;
export type WorkspaceVersionConflictResponse = z.infer<
	typeof workspaceVersionConflictResponseSchema
>;
