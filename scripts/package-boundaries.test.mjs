import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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

test("MDSync skills exposes a built runtime adapter with explicit dependencies", async () => {
	const manifest = JSON.parse(
		await readFile(
			path.join(ROOT_DIR, "packages/mdsync-skills/package.json"),
			"utf8"
		)
	);
	assert.equal(manifest.exports["./runtime"].default, "./dist/runtime.mjs");
	assert.equal(manifest.exports["./runtime"].types, "./dist/runtime.d.mts");
	assert.equal(manifest.files.includes("dist"), true);
	assert.equal(manifest.dependencies["@mdsync/client"], "0.1.0");
	assert.equal(manifest.dependencies["@ha2ha/protocol"], undefined);
	const runtime = await readFile(
		path.join(ROOT_DIR, "packages/mdsync-skills/src/runtime.ts"),
		"utf8"
	);
	assert.equal(runtime.includes('from "@mdsync/client"'), true);
	assert.equal(runtime.includes('from "@ha2ha/protocol"'), false);
});

test("Alchemy local development cannot mutate the deployed shared stage", async () => {
	const infraManifest = JSON.parse(
		await readFile(path.join(ROOT_DIR, "packages/infra/package.json"), "utf8")
	);
	const rootManifest = JSON.parse(
		await readFile(path.join(ROOT_DIR, "package.json"), "utf8")
	);
	assert.equal(infraManifest.scripts.dev, "alchemy dev --stage local");
	assert.equal(infraManifest.scripts["deploy:server"], "alchemy deploy");
	assert.equal(
		rootManifest.scripts["dev:server"],
		"ROBOSYNC_SERVER_ONLY=1 ROBOSYNC_DEV_SERVER_PORT=3200 WEB_ORIGIN=http://127.0.0.1:3200 pnpm --filter @mdsync/infra run dev"
	);
});

test("workspace persistence uses the Drizzle repository boundary", async () => {
	const workspaceSourceDir = path.join(ROOT_DIR, "apps/server/src/workspaces");
	const files = (await listSourceFiles(workspaceSourceDir)).filter(
		(file) => !file.endsWith(".test.ts")
	);
	const contents = await Promise.all(
		files.map(async (file) => ({
			file,
			text: await readFile(file, "utf8"),
		}))
	);

	const forbiddenPatterns = [".DB.prepare", ".DB.batch"];
	for (const { file, text } of contents) {
		for (const pattern of forbiddenPatterns) {
			assert.equal(
				text.includes(pattern),
				false,
				`${path.relative(ROOT_DIR, file)} must use workspace storage helpers instead of ${pattern}`
			);
		}
	}
});

async function listSourceFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return listSourceFiles(entryPath);
			}
			return entry.name.endsWith(".ts") ? [entryPath] : [];
		})
	);
	return files.flat();
}
