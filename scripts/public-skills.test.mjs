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
		"skills/ha2ha/SKILL.md",
		{
			homepage: "https://ha2ha.md",
			name: "ha2ha",
			packageDirectory: "packages/ha2ha-skills",
			packageName: "@ha2ha/skills",
		},
	],
	[
		"skills/mdsync/SKILL.md",
		{
			homepage: "https://sync.ha2ha.md",
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
const UNAVAILABLE_NPM_INSTALL_PATTERN = /npm install\s+@(ha2ha|mdsync)\//u;
const PENDING_REGISTRY_PATTERN = /registry publication remains pending/iu;
const SKILL_PACKAGE_CLEAN_PATTERN = / clean$/u;
const SKILL_PACKAGE_STAGING_PATTERN = /stage-skill-package\.mjs/u;
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---/u;
const HA2HA_PORTABILITY_PATTERN = /Keep the skill portable/u;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/gu;
const REFERENCE_PATH_PATTERN = /^references\/[^/]+$/u;
const PRODUCTION_WEB_ORIGIN = "https://sync.ha2ha.md";
const PRODUCTION_API_ORIGIN = "https://sync-api.ha2ha.md";
const PRODUCTION_HA2HA_ORIGIN = "https://ha2ha.md";
const PUBLIC_GITHUB = "https://github.com/pax-k/ha2ha-mdsync";
const PUBLIC_HA2HA_SKILL = "https://skills.sh/pax-k/ha2ha-mdsync/ha2ha";
const PUBLIC_MDSYNC_SKILL = "https://skills.sh/pax-k/ha2ha-mdsync/mdsync";
const PUBLIC_REPOSITORY = "git+https://github.com/pax-k/ha2ha-mdsync.git";
const PUBLIC_INSTRUCTION_FILES = [
	"README.md",
	"packages/ha2ha-client/README.md",
	"packages/ha2ha-http/README.md",
	"packages/ha2ha-protocol/README.md",
	"packages/ha2ha-skills/README.md",
	"packages/mdsync-client/README.md",
	"packages/mdsync-skills/README.md",
];
const PUBLIC_UI_FILES = [
	"apps/ha2ha/src/site-components.tsx",
	"apps/ha2ha/src/site-content.ts",
	"apps/web/src/app.tsx",
	"apps/web/src/docs-pages.tsx",
	"apps/web/src/landing-page.tsx",
	"apps/web/src/public-components.tsx",
	"apps/web/src/public-content.ts",
];
const PUBLIC_PACKAGES = new Map([
	["packages/ha2ha-protocol", ["@ha2ha/protocol", "https://ha2ha.md"]],
	["packages/ha2ha-client", ["@ha2ha/client", "https://ha2ha.md"]],
	["packages/ha2ha-skills", ["@ha2ha/skills", "https://ha2ha.md"]],
	["packages/mdsync-contracts", ["@mdsync/contracts", PRODUCTION_WEB_ORIGIN]],
	["packages/mdsync-client", ["@mdsync/client", PRODUCTION_WEB_ORIGIN]],
	["packages/mdsync-skills", ["@mdsync/skills", PRODUCTION_WEB_ORIGIN]],
]);

test("only supported public skills are discoverable", async () => {
	const skillPaths = (await findFiles(ROOT_DIR, "SKILL.md"))
		.map((file) => path.relative(ROOT_DIR, file))
		.sort();
	const expectedPaths = [...EXPECTED_SKILLS.keys()].sort();
	assert.deepEqual(skillPaths, expectedPaths);
});

test("npm packages stage the canonical catalog skills only for packing", async () => {
	await Promise.all(
		[...EXPECTED_SKILLS].map(async ([skillPath, expected]) => {
			const packageManifest = JSON.parse(
				await readFile(
					path.join(ROOT_DIR, expected.packageDirectory, "package.json"),
					"utf8"
				)
			);
			assert.match(
				packageManifest.scripts.prepack,
				SKILL_PACKAGE_STAGING_PATTERN
			);
			assert.ok(packageManifest.scripts.prepack.endsWith(expected.name));
			assert.match(
				packageManifest.scripts.postpack,
				SKILL_PACKAGE_STAGING_PATTERN
			);
			assert.match(
				packageManifest.scripts.postpack,
				SKILL_PACKAGE_CLEAN_PATTERN
			);
			assert.equal(
				packageManifest.exports[`./skills/${expected.name}`],
				`./skills/${expected.name}/SKILL.md`
			);
			assert.ok(skillPath.startsWith("skills/"));
		})
	);
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
		path.join(ROOT_DIR, "skills/ha2ha/SKILL.md"),
		"utf8"
	);
	assert.match(ha2ha, HA2HA_PORTABILITY_PATTERN);
	assert.ok(ha2ha.includes("https://ha2ha.md"));

	const mdsyncRoot = path.join(ROOT_DIR, "skills/mdsync");
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
					"https://github.com/pax-k/ha2ha-mdsync/issues"
				);
			}
		)
	);
});

test("public apps expose the canonical developer journey without placeholders", async () => {
	const publicUiText = (
		await Promise.all(
			PUBLIC_UI_FILES.map((file) => readFile(path.join(ROOT_DIR, file), "utf8"))
		)
	).join("\n");
	for (const expectedLink of [
		PUBLIC_GITHUB,
		PRODUCTION_HA2HA_ORIGIN,
		PUBLIC_HA2HA_SKILL,
		PUBLIC_MDSYNC_SKILL,
	]) {
		assert.ok(publicUiText.includes(expectedLink), `Missing ${expectedLink}`);
	}
	for (const route of [
		'path="/"',
		'path="/new"',
		'path="/docs"',
		'path="/docs/getting-started"',
		'path="/docs/agent-handoff"',
		'path="/docs/security"',
		'path="/w/:workspaceId/*"',
	]) {
		assert.ok(publicUiText.includes(route), `Missing public route ${route}`);
	}
	assert.equal(publicUiText.includes("Coming soon"), false);
	assert.equal(publicUiText.includes("github-placeholder"), false);
	assert.equal(publicUiText.includes("mdsync-placeholder"), false);
	assert.ok(publicUiText.includes("HA2HA Core 1.0"));
	assert.ok(publicUiText.includes("Extended collaboration profiles"));
	assertSafePublishedText("public UI", publicUiText);
});

test("public instructions describe pending registry distribution honestly", async () => {
	const instructionText = (
		await Promise.all(
			PUBLIC_INSTRUCTION_FILES.map((file) =>
				readFile(path.join(ROOT_DIR, file), "utf8")
			)
		)
	).join("\n");
	assert.equal(UNAVAILABLE_NPM_INSTALL_PATTERN.test(instructionText), false);
	assert.ok(instructionText.includes("registry-ready"));
	assert.match(instructionText, PENDING_REGISTRY_PATTERN);
	assert.ok(
		instructionText.includes("npx skills add pax-k/ha2ha-mdsync --skill ha2ha")
	);
	assert.ok(
		instructionText.includes("npx skills add pax-k/ha2ha-mdsync --skill mdsync")
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
