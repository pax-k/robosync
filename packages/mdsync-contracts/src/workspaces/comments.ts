import { z } from "zod";
import {
	workspaceActorSchema,
	workspaceJsonObjectSchema,
	workspaceTimestampSchema,
} from "./base";

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
