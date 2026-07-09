import { z } from "zod";
import { workspaceTimestampSchema } from "./base";

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
