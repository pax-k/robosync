import type { MdsyncWorkerBindings } from "./src/bindings";

export type CloudflareEnv = MdsyncWorkerBindings;

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
