import { type server } from "@mdsync/infra/alchemy.run";

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

export type CloudflareEnv = typeof server.Env;

declare global {
	type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
	// biome-ignore lint/style/noNamespace: Cloudflare Workers types expose env through this namespace augmentation.
	namespace Cloudflare {
		// biome-ignore lint/suspicious/noShadow: This intentionally augments Cloudflare.Env, distinct from the global Env alias.
		export interface Env extends CloudflareEnv {}
	}
}
