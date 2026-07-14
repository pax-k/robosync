import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	".."
);
const EXPECTED_SKILLS = new Map([
	[
		"packages/ha2ha-skills/skills/ha2ha/SKILL.md",
		{
			homepage: "https://mdsync-ha2ha-pax.pax.workers.dev",
			name: "ha2ha",
			packageDirectory: "packages/ha2ha-skills",
			packageName: "@ha2ha/skills",
		},
	],
	[
		"packages/mdsync-skills/skills/mdsync/SKILL.md",
		{
			homepage: "https://mdsync-web-pax.pax.workers.dev",
			name: "mdsync",
			packageDirectory: "packages/mdsync-skills",
			packageName: "@mdsync/skills",
		},
	],
]);
const IGNORED_DIRECTORIES = new Set([
	".alchemy",
	".git",
	".playwright-cli",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
	"playwright-report",
	"test-results",
]);
const PUBLISHED_FORBIDDEN_TEXT = [
	"/Users/pax",
	"docs/v1/skills",
	"example.com",
	"http://localhost",
	"packages/ha2ha-skills",
	"packages/mdsync-skills",
];
const TOKEN_LIKE_PATTERNS = [
	/sk-[A-Za-z0-9_-]{20,}/u,
	/gh[oprsu]_[A-Za-z0-9_]{20,}/u,
	/xox[baprs]-[A-Za-z0-9-]{20,}/u,
	/[?&](?:edit|k)=[A-Za-z0-9_-]{16,}/u,
];
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---/u;
const HA2HA_PORTABILITY_PATTERN = /Keep the skill portable/u;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/gu;
const REFERENCE_PATH_PATTERN = /^references\/[^/]+$/u;
const PRODUCTION_WEB_ORIGIN = "https://mdsync-web-pax.pax.workers.dev";
const PRODUCTION_API_ORIGIN = "https://mdsync-server-pax.pax.workers.dev";
const PUBLIC_REPOSITORY = "git+https://github.com/pax-k/robosync.git";
const PUBLIC_PACKAGES = new Map([
	[
		"packages/ha2ha-protocol",
		["@ha2ha/protocol", "https://mdsync-ha2ha-pax.pax.workers.dev"],
	],
	[
		"packages/ha2ha-client",
		["@ha2ha/client", "https://mdsync-ha2ha-pax.pax.workers.dev"],
	],
	[
		"packages/ha2ha-skills",
		["@ha2ha/skills", "https://mdsync-ha2ha-pax.pax.workers.dev"],
	],
	["packages/mdsync-contracts", ["@mdsync/contracts", PRODUCTION_WEB_ORIGIN]],
	["packages/mdsync-client", ["@mdsync/client", PRODUCTION_WEB_ORIGIN]],
	["packages/mdsync-skills", ["@mdsync/skills", PRODUCTION_WEB_ORIGIN]],
]);

test("only supported public skills are discoverable", async () => {
	const skillPaths = (await findFiles(ROOT_DIR, "SKILL.md"))
		.map((file) => path.relative(ROOT_DIR, file))
		.sort();
	assert.deepEqual(skillPaths, [...EXPECTED_SKILLS.keys()].sort());
});

test("public skills have valid metadata, safe content, and working references", async () => {
	await Promise.all(
		[...EXPECTED_SKILLS].map(async ([relativeSkillPath, expected]) => {
			const skillPath = path.join(ROOT_DIR, relativeSkillPath);
			const skillRoot = path.dirname(skillPath);
			const skillText = await readFile(skillPath, "utf8");
			const frontmatter = skillText.match(FRONTMATTER_PATTERN)?.[1];
			assert.ok(frontmatter, `${relativeSkillPath} needs YAML frontmatter`);
			assert.equal(frontmatterField(frontmatter, "name"), expected.name);
			assert.equal(frontmatterField(frontmatter, "license"), "MIT");
			const description = frontmatterField(frontmatter, "description");
			assert.ok(description.length > 0 && description.length <= 1024);
			assert.equal(path.basename(skillRoot), expected.name);

			const publishedFiles = await findPublishedTextFiles(skillRoot);
			const publishedTexts = await Promise.all(
				publishedFiles.map(async (file) => ({
					file,
					text: await readFile(file, "utf8"),
				}))
			);
			for (const { file, text } of publishedTexts) {
				assertSafePublishedText(path.relative(ROOT_DIR, file), text);
			}
			await assertWorkingReferences(skillRoot, skillText);
		})
	);
});

test("public skills point at the production Cloudflare deployment", async () => {
	const ha2ha = await readFile(
		path.join(ROOT_DIR, "packages/ha2ha-skills/skills/ha2ha/SKILL.md"),
		"utf8"
	);
	assert.match(ha2ha, HA2HA_PORTABILITY_PATTERN);
	assert.ok(ha2ha.includes("https://mdsync-ha2ha-pax.pax.workers.dev"));

	const mdsyncRoot = path.join(
		ROOT_DIR,
		"packages/mdsync-skills/skills/mdsync"
	);
	const mdsyncText = (
		await Promise.all(
			(
				await findPublishedTextFiles(mdsyncRoot)
			).map((file) => readFile(file, "utf8"))
		)
	).join("\n");
	assert.ok(mdsyncText.includes(PRODUCTION_WEB_ORIGIN));
	assert.ok(mdsyncText.includes(PRODUCTION_API_ORIGIN));
	assert.ok(
		mdsyncText.includes(`${PRODUCTION_WEB_ORIGIN}/.well-known/mdsync.json`)
	);
	assert.ok(mdsyncText.includes("MDSYNC_BASE_URL"));
	assert.ok(mdsyncText.includes("HTTP Fallback"));
});

test("public package metadata identifies the monorepo and product boundary", async () => {
	await Promise.all(
		[...PUBLIC_PACKAGES].map(
			async ([packageDirectory, [packageName, homepage]]) => {
				const manifest = JSON.parse(
					await readFile(
						path.join(ROOT_DIR, packageDirectory, "package.json"),
						"utf8"
					)
				);
				assert.equal(manifest.name, packageName);
				assert.equal(manifest.license, "MIT");
				assert.equal(manifest.repository.url, PUBLIC_REPOSITORY);
				assert.equal(manifest.repository.directory, packageDirectory);
				assert.equal(manifest.homepage, homepage);
				assert.equal(
					manifest.bugs.url,
					"https://github.com/pax-k/robosync/issues"
				);
			}
		)
	);
});

const findFiles = async (directory, filename) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const results = await Promise.all(
		entries.map((entry) => {
			if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
				return [];
			}
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return findFiles(entryPath, filename);
			}
			return entry.name === filename ? [entryPath] : [];
		})
	);
	return results.flat();
};

const findPublishedTextFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const results = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return findPublishedTextFiles(entryPath);
			}
			return entry.name.endsWith(".md") || entry.name.endsWith(".yaml")
				? [entryPath]
				: [];
		})
	);
	return results.flat();
};

const frontmatterField = (frontmatter, field) => {
	const prefix = `${field}:`;
	const line = frontmatter
		.split("\n")
		.find((candidate) => candidate.startsWith(prefix));
	assert.ok(line, `Missing frontmatter field: ${field}`);
	return line.slice(prefix.length).trim();
};

const assertSafePublishedText = (relativePath, text) => {
	for (const forbidden of PUBLISHED_FORBIDDEN_TEXT) {
		assert.equal(
			text.includes(forbidden),
			false,
			`${relativePath} contains forbidden text: ${forbidden}`
		);
	}
	for (const pattern of TOKEN_LIKE_PATTERNS) {
		assert.equal(
			pattern.test(text),
			false,
			`${relativePath} contains a token-like value matching ${pattern}`
		);
	}
};

const assertWorkingReferences = async (skillRoot, skillText) => {
	const references = [...skillText.matchAll(MARKDOWN_LINK_PATTERN)].map(
		([, reference]) => reference
	);
	await Promise.all(
		references.map(async (reference) => {
			assert.ok(reference);
			if (
				reference.startsWith("http://") ||
				reference.startsWith("https://") ||
				reference.startsWith("#")
			) {
				return;
			}
			const [withoutAnchor] = reference.split("#", 1);
			assert.ok(withoutAnchor);
			assert.match(withoutAnchor, REFERENCE_PATH_PATTERN);
			const target = path.resolve(skillRoot, withoutAnchor);
			assert.equal(target.startsWith(`${skillRoot}${path.sep}`), true);
			assert.equal((await stat(target)).isFile(), true);
		})
	);
};
