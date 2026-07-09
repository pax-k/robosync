import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const SOURCE_LIMIT = 800;
const REACT_COMPONENT_LIMIT = 700;
const SOURCE_ROOTS = ["apps", "packages"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIPPED_SEGMENTS = new Set([
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);
const ALLOWLIST = new Map([
	[
		"packages/ui/src/components/dropdown-menu.tsx",
		"Cohesive framework-neutral primitive wrapper.",
	],
]);

test("source modules stay inside ownership size boundaries", async () => {
	const files = await collectSourceFiles();
	const violations = [];
	const sourceFiles = await Promise.all(
		files.map(async (file) => ({
			file,
			text: await readFile(file, "utf8"),
		}))
	);

	for (const { file, text } of sourceFiles) {
		const relativePath = toRelativePath(file);
		const lineCount = countLines(text);
		const limit = relativePath.endsWith(".tsx")
			? REACT_COMPONENT_LIMIT
			: SOURCE_LIMIT;

		if (lineCount <= limit || ALLOWLIST.has(relativePath)) {
			continue;
		}

		violations.push(`${relativePath} has ${lineCount} lines, limit ${limit}`);
	}

	assert.deepEqual(violations, []);

	for (const [allowlistedPath, reason] of ALLOWLIST) {
		assert.ok(
			reason.length > 0,
			`${allowlistedPath} must document an ownership reason`
		);
	}
});

async function collectSourceFiles() {
	const filesByRoot = await Promise.all(
		SOURCE_ROOTS.map((sourceRoot) =>
			collectSourceFilesFrom(path.join(ROOT_DIR, sourceRoot))
		)
	);

	return filesByRoot.flat();
}

async function collectSourceFilesFrom(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const filesByEntry = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return SKIPPED_SEGMENTS.has(entry.name)
					? []
					: collectSourceFilesFrom(entryPath);
			}

			if (!isSourceModule(entryPath)) {
				return [];
			}

			return [entryPath];
		})
	);

	return filesByEntry.flat();
}

function isSourceModule(filePath) {
	if (!filePath.includes(`${path.sep}src${path.sep}`)) {
		return false;
	}
	if (filePath.endsWith(".d.ts")) {
		return false;
	}
	if (filePath.includes(".test.") || filePath.includes(".spec.")) {
		return false;
	}

	return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function countLines(text) {
	if (text.length === 0) {
		return 0;
	}

	const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
	return normalized.endsWith("\n")
		? normalized.split("\n").length - 1
		: normalized.split("\n").length;
}

function toRelativePath(filePath) {
	return path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
}
