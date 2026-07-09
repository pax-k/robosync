import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");

test("env package does not depend on infra deployment modules", async () => {
	const files = [
		"packages/env/env.d.ts",
		"packages/env/package.json",
		"packages/env/src/server.ts",
	];
	const contents = await Promise.all(
		files.map(async (file) => ({
			file,
			text: await readFile(path.join(ROOT_DIR, file), "utf8"),
		}))
	);

	for (const { file, text } of contents) {
		assert.equal(
			text.includes("@mdsync/infra"),
			false,
			`${file} must not import or depend on @mdsync/infra`
		);
		assert.equal(
			text.includes("alchemy.run"),
			false,
			`${file} must not infer bindings from alchemy.run`
		);
	}
});

test("base TypeScript config stays runtime-neutral", async () => {
	const config = JSON.parse(
		await readFile(
			path.join(ROOT_DIR, "packages/config/tsconfig.base.json"),
			"utf8"
		)
	);
	assert.deepEqual(config.compilerOptions.types, []);
});

test("UI package stays free of Next-only runtime dependencies", async () => {
	const manifest = JSON.parse(
		await readFile(path.join(ROOT_DIR, "packages/ui/package.json"), "utf8")
	);
	assert.equal(manifest.dependencies["next-themes"], undefined);
});

test("installable MDSync client declares its contract dependency", async () => {
	const manifest = JSON.parse(
		await readFile(
			path.join(ROOT_DIR, "packages/mdsync-client/package.json"),
			"utf8"
		)
	);
	assert.equal(manifest.dependencies["@mdsync/contracts"], "0.1.0");
});
