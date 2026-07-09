import { z } from "zod";
import {
	workspaceActorSchema,
	workspaceReadAccessSchema,
	workspaceTimestampSchema,
	workspaceWriteAccessSchema,
} from "./base";

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
