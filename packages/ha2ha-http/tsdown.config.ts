import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: {
		cli: "./src/cli.ts",
		conformance: "./src/conformance.ts",
		index: "./src/index.ts",
	},
	format: "esm",
	outDir: "./dist",
	sourcemap: true,
	target: "node20",
});
