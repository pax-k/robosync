import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: {
		cli: "./src/cli.ts",
		constants: "./src/constants.ts",
		index: "./src/index.ts",
		schemas: "./src/schemas.ts",
		"v3-constants": "./src/v3-constants.ts",
		"v3-schemas": "./src/v3-schemas.ts",
		"v3-validator": "./src/v3-validator.ts",
		validator: "./src/validator.ts",
	},
	format: "esm",
	outDir: "./dist",
	sourcemap: true,
	target: "node20",
});
