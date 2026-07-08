import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: {
		cli: "./src/cli.ts",
		constants: "./src/constants.ts",
		index: "./src/index.ts",
		schemas: "./src/schemas.ts",
		validator: "./src/validator.ts",
	},
	format: "esm",
	outDir: "./dist",
	sourcemap: true,
	target: "node20",
});
