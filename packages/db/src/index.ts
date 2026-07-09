import { env } from "@mdsync/env/server";
import { createDbFromD1 } from "./client";

// biome-ignore lint/performance/noBarrelFile: Root export preserves the package public API.
export { createDbFromD1, dbSchema, type MdsyncDb } from "./client";

export function createDb() {
	return createDbFromD1(env.DB);
}
