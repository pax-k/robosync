import { z } from "zod";

const originSchema = z
	.string()
	.url()
	.refine((value) => new URL(value).origin === value, {
		message:
			"Expected an absolute URL origin without a path, query, or fragment.",
	});

export const mdsyncDiscoveryResponseSchema = z
	.object({
		apiOrigin: originSchema,
		discoveryVersion: z.literal(1),
		product: z.literal("mdsync"),
		webOrigin: originSchema,
	})
	.strict();
