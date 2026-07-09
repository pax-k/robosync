import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/workspaces.ts"],
	format: ["esm"],
});
