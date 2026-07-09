import { z } from "zod";
import { workspaceReadAccessSchema, workspaceWriteAccessSchema } from "./base";

export const workspaceCapabilityKindSchema = z.enum(["read", "edit"]);

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
