import { z } from "zod";
import { workspaceJsonObjectSchema, workspaceTimestampSchema } from "./base";
import { workspaceMetadataSchema } from "./files";

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
