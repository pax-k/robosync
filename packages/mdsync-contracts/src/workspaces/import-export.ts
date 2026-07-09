import { z } from "zod";
import { workspaceAdminEventSchema } from "./admin";
import {
	workspaceJsonObjectSchema,
	workspaceReadAccessSchema,
	workspaceTimestampSchema,
	workspaceWriteAccessSchema,
} from "./base";
import { createdWorkspaceResponseSchema } from "./files";

export const WORKSPACE_EXPORT_FORMAT = "mdsync.workspace-export.v1";

export const WORKSPACE_EXPORT_SCHEMA_VERSION = 1;

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
