import { z } from "zod";
import { workspaceFileResponseSchema } from "./files";

export const workspaceVersionConflictResponseSchema = z
	.object({
		error: z.literal("version_conflict"),
		latest: workspaceFileResponseSchema.nullable(),
		message: z.string().trim().min(1),
	})
	.strict();
