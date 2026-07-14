import { z } from "zod";
import { workspaceTimestampSchema } from "./base";

export const workspaceActivitySourceSchema = z.enum(["comment", "event"]);

export const workspaceActivityItemSchema = z
	.object({
		actor: z.string().nullable(),
		createdAt: workspaceTimestampSchema,
		id: z.string().trim().min(1),
		path: z.string().nullable(),
		source: workspaceActivitySourceSchema,
		type: z.string().trim().min(1),
		version: z.number().int().positive().nullable(),
	})
	.strict();

export const workspaceActivityResponseSchema = z
	.object({
		items: z.array(workspaceActivityItemSchema),
		workspaceId: z.string().trim().min(1),
	})
	.strict();
