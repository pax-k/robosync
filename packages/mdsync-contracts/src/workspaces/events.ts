import { z } from "zod";
import { workspaceJsonObjectSchema, workspaceTimestampSchema } from "./base";

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
