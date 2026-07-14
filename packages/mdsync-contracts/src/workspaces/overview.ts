import { HA2HA_TASK_STATES } from "@ha2ha/protocol/constants";
import { z } from "zod";
import { workspaceTimestampSchema } from "./base";

const workspaceOverviewTaskPrioritySchema = z.enum([
	"urgent",
	"high",
	"medium",
	"low",
]);

export const workspaceOverviewTaskStateSchema = z.enum(HA2HA_TASK_STATES);

export const workspaceOverviewResponseSchema = z
	.object({
		activity: z
			.object({
				recent: z.array(
					z
						.object({
							actor: z.string().nullable(),
							createdAt: workspaceTimestampSchema,
							path: z.string().nullable(),
							type: z.string().trim().min(1),
							version: z.number().int().positive().nullable(),
						})
						.strict()
				),
			})
			.strict(),
		comments: z
			.object({
				staleAnchors: z.number().int().nonnegative(),
				total: z.number().int().nonnegative(),
				unresolved: z.number().int().nonnegative(),
			})
			.strict(),
		files: z
			.object({
				latestUpdatedAt: workspaceTimestampSchema.nullable(),
				total: z.number().int().nonnegative(),
			})
			.strict(),
		generatedAt: workspaceTimestampSchema,
		tasks: z
			.object({
				byState: z.array(
					z
						.object({
							count: z.number().int().nonnegative(),
							name: workspaceOverviewTaskStateSchema,
						})
						.strict()
				),
				invalidCount: z.number().int().nonnegative(),
				items: z.array(
					z
						.object({
							id: z.string().nullable(),
							owner: z.string().nullable(),
							path: z.string().trim().min(1),
							priority: workspaceOverviewTaskPrioritySchema.nullable(),
							state: workspaceOverviewTaskStateSchema.nullable(),
							title: z.string().nullable(),
							updatedBy: z.string().nullable(),
							valid: z.boolean(),
							version: z.number().int().positive(),
						})
						.strict()
				),
				total: z.number().int().nonnegative(),
			})
			.strict(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();
