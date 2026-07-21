import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
	buildRawFileUrl,
	buildRawListingUrl,
	buildWorkspaceUrl,
	collectWorkspaceFiles,
	contentTypeForPath,
	parseArgs,
	readAccessFromOptions,
	writeAccessFromOptions,
} from "./mdsync.mjs";

test("collectWorkspaceFiles preserves relative POSIX paths and skips ignored content", async () => {
	const root = await mkdtemp(path.join(tmpdir(), "mdsync-files-"));
	try {
		await mkdir(path.join(root, "docs", "nested"), { recursive: true });
		await mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
		await mkdir(path.join(root, "dist"), { recursive: true });
		await writeFile(path.join(root, "README.md"), "# Readme\n");
		await writeFile(
			path.join(root, "docs", "nested", "guide.ts"),
			"export {};\n"
		);
		await writeFile(
			path.join(root, "node_modules", "pkg", "ignored.md"),
			"no\n"
		);
		await writeFile(path.join(root, "dist", "ignored.md"), "no\n");
		await writeFile(path.join(root, "binary.bin"), Buffer.from([65, 0, 66]));
		await writeFile(path.join(root, ".DS_Store"), "ignored\n");

		const files = await collectWorkspaceFiles(root);
		const filesByPath = new Map(files.map((file) => [file.path, file]));

		assert.deepEqual([...filesByPath.keys()].sort(), [
			"README.md",
			"docs/nested/guide.ts",
		]);
		assert.equal(
			filesByPath.get("README.md")?.contentType,
			"text/markdown; charset=utf-8"
		);
		assert.equal(
			filesByPath.get("docs/nested/guide.ts")?.contentType,
			"text/typescript; charset=utf-8"
		);
	} finally {
		await rm(root, { force: true, recursive: true });
	}
});

test("contentTypeForPath maps known text formats and falls back to plain text", () => {
	assert.equal(contentTypeForPath("README.md"), "text/markdown; charset=utf-8");
	assert.equal(
		contentTypeForPath("data.json"),
		"application/json; charset=utf-8"
	);
	assert.equal(
		contentTypeForPath("script.ts"),
		"text/typescript; charset=utf-8"
	);
	assert.equal(
		contentTypeForPath("schema.sql"),
		"application/sql; charset=utf-8"
	);
	assert.equal(
		contentTypeForPath("config.yaml"),
		"application/yaml; charset=utf-8"
	);
	assert.equal(
		contentTypeForPath("unknown.custom"),
		"text/plain; charset=utf-8"
	);
});

test("URL builders map local server URLs to web URLs and encode paths", () => {
	const previousBaseUrl = process.env.MDSYNC_BASE_URL;
	const previousWebUrl = process.env.MDSYNC_WEB_URL;
	try {
		process.env.MDSYNC_BASE_URL = "http://localhost:3000/";
		delete process.env.MDSYNC_WEB_URL;

		assert.equal(
			buildRawListingUrl("workspace 1", "edit token"),
			"http://localhost:3000/w/workspace%201/raw?edit=edit%20token"
		);
		assert.equal(
			buildRawFileUrl("workspace 1", "docs/Hello World.md", "edit token"),
			"http://localhost:3000/w/workspace%201/raw/docs/Hello%20World.md?edit=edit%20token"
		);
		assert.equal(
			buildWorkspaceUrl("workspace 1", "edit token"),
			"http://localhost:5173/w/workspace%201?edit=edit%20token"
		);
	} finally {
		restoreEnv("MDSYNC_BASE_URL", previousBaseUrl);
		restoreEnv("MDSYNC_WEB_URL", previousWebUrl);
	}
});

test("URL builders map deployed server hosts to deployed web hosts", () => {
	const previousBaseUrl = process.env.MDSYNC_BASE_URL;
	const previousWebUrl = process.env.MDSYNC_WEB_URL;
	try {
		process.env.MDSYNC_BASE_URL = "https://sync-api.ha2ha.md";
		delete process.env.MDSYNC_WEB_URL;

		assert.equal(
			buildWorkspaceUrl("workspace-1", "token"),
			"https://sync.ha2ha.md/w/workspace-1?edit=token"
		);
	} finally {
		restoreEnv("MDSYNC_BASE_URL", previousBaseUrl);
		restoreEnv("MDSYNC_WEB_URL", previousWebUrl);
	}
});

test("parseArgs separates positional arguments and known options", () => {
	const parsed = parseArgs(
		[
			"workspace-1",
			"README.md",
			"--token",
			"secret",
			"--base-version",
			"2",
			"--actor",
			"codex-pax",
			"--editable",
		],
		"usage"
	);

	assert.deepEqual(parsed.positional, ["workspace-1", "README.md"]);
	assert.deepEqual(parsed.options, {
		actor: "codex-pax",
		"base-version": "2",
		editable: true,
		token: "secret",
	});
});

test("access option helpers preserve default and explicit modes", () => {
	assert.equal(readAccessFromOptions({}), "token");
	assert.equal(readAccessFromOptions({ public: true }), "public");
	assert.equal(writeAccessFromOptions({}), "token");
	assert.equal(writeAccessFromOptions({ readonly: true }), "none");
});

function restoreEnv(name, value) {
	if (value === undefined) {
		delete process.env[name];
		return;
	}
	process.env[name] = value;
}
