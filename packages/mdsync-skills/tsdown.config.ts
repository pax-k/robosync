import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: {
		runtime: "./src/runtime.ts",
	},
	format: "esm",
	outDir: "./dist",
	sourcemap: true,
	target: "node20",
});
