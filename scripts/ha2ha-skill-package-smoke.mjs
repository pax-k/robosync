#!/usr/bin/env node
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	".."
);
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");
const TIMEOUT_MS = 120_000;
const TOKEN_LIKE_SECRET_PATTERNS = [
	/sk-[A-Za-z0-9_-]{20,}/u,
	/ghp_[A-Za-z0-9_]{20,}/u,
	/xox[baprs]-[A-Za-z0-9-]{20,}/u,
];

const main = async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "ha2ha-skill-smoke-"));
	try {
		const packDir = path.join(tempDir, "packs");
		const projectDir = path.join(tempDir, "project");
		await mkdir(packDir, { recursive: true });
		await mkdir(projectDir, { recursive: true });

		const protocolTarball = await packPackage("ha2ha-protocol", packDir);
		const skillsTarball = await packPackage("ha2ha-skills", packDir);

		await writeFile(
			path.join(projectDir, "package.json"),
			JSON.stringify({ private: true, type: "module" }, null, 2)
		);
		await run(
			"npm",
			[
				"install",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund",
				protocolTarball,
				skillsTarball,
			],
			{
				cwd: projectDir,
			}
		);

		const installedSkillDir = path.join(
			projectDir,
			"node_modules",
			"@ha2ha",
			"skills",
			"skills",
			"ha2ha"
		);
		const skillText = await readFile(
			path.join(installedSkillDir, "SKILL.md"),
			"utf8"
		);
		assertNoRepoLocalPaths(skillText);
		assertNoTokenLikeSecrets(skillText);
		assertIncludes(skillText, "baseVersion", "skill baseVersion guidance");
		assertIncludes(skillText, "version_conflict", "skill conflict guidance");
		assertIncludes(
			skillText,
			"without using MDSync product-only",
			"skill product boundary"
		);

		const fixtureDir = path.join(projectDir, "fixture");
		await cp(
			path.join(
				projectDir,
				"node_modules",
				"@ha2ha",
				"skills",
				"fixtures",
				"minimal-workspace"
			),
			fixtureDir,
			{ recursive: true }
		);
		await run(
			path.join(projectDir, "node_modules", ".bin", "ha2ha-validate"),
			["fixture"],
			{
				cwd: projectDir,
			}
		);

		await simulateTwoActorSkillFlow(fixtureDir);
		await run(
			path.join(projectDir, "node_modules", ".bin", "ha2ha-validate"),
			["fixture"],
			{
				cwd: projectDir,
			}
		);

		process.stdout.write(
			JSON.stringify(
				{
					ok: true,
					package: "@ha2ha/skills",
					skill: "ha2ha",
				},
				null,
				2
			)
		);
		process.stdout.write("\n");
	} finally {
		await rm(tempDir, { force: true, recursive: true });
	}
};

const simulateTwoActorSkillFlow = async (fixtureDir) => {
	const taskPath = path.join(fixtureDir, "tasks", "SKILL-001.md");
	const task = await readFile(taskPath, "utf8");
	const claimedTask = task
		.replace("state: ready", "state: claimed")
		.replace("owner: null", "owner: agent-context-a")
		.replace("updated_by: agent-context-a", "updated_by: agent-context-a")
		.replace(
			"evidence: []",
			"evidence:\n  - evidence/SKILL-001/skill-smoke.md"
		);
	await writeFile(taskPath, claimedTask);

	const evidenceDir = path.join(fixtureDir, "evidence", "SKILL-001");
	await mkdir(evidenceDir, { recursive: true });
	await writeFile(
		path.join(evidenceDir, "skill-smoke.md"),
		[
			"---",
			"id: ev-SKILL-001-skill-smoke",
			"task: SKILL-001",
			"target:",
			"  workspaceId: skill-fixture",
			"  path: tasks/SKILL-001.md",
			"  version: 1",
			"kind: dogfood",
			"result: pass",
			"actor: agent-context-b",
			"created_at: 2026-07-08T00:00:00.000Z",
			"---",
			"",
			"Installed skill package smoke validated the fixture.",
			"",
		].join("\n")
	);
};

const packPackage = async (packageName, packDir) => {
	const packageDir = path.join(PACKAGES_DIR, packageName);
	const { stdout } = await run("npm", [
		"pack",
		"--json",
		packageDir,
		"--pack-destination",
		packDir,
	]);
	const result = parsePackOutput(stdout);
	const filename = result[0]?.filename;
	if (typeof filename !== "string") {
		throw new Error(`npm pack did not report a filename for ${packageName}.`);
	}
	return path.join(packDir, filename);
};

const assertIncludes = (text, expected, label) => {
	if (!text.includes(expected)) {
		throw new Error(`Missing ${label}: ${expected}`);
	}
};

const assertNoRepoLocalPaths = (text) => {
	const forbidden = ["docs/v1/skills", "/Users/pax", "packages/ha2ha-skills"];
	for (const pattern of forbidden) {
		if (text.includes(pattern)) {
			throw new Error(`Installed skill contains repo-local path: ${pattern}`);
		}
	}
};

const assertNoTokenLikeSecrets = (text) => {
	for (const pattern of TOKEN_LIKE_SECRET_PATTERNS) {
		if (pattern.test(text)) {
			throw new Error(`Installed skill contains token-like secret: ${pattern}`);
		}
	}
};

const run = async (command, args, options = {}) => {
	try {
		return await execFileAsync(command, args, {
			cwd: ROOT_DIR,
			timeout: TIMEOUT_MS,
			...options,
		});
	} catch (error) {
		const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
		const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
		throw new Error(`${command} ${args.join(" ")} failed.${stdout}${stderr}`, {
			cause: error,
		});
	}
};

const parsePackOutput = (stdout) => {
	const output = stdout.trim();
	const jsonStart = output.lastIndexOf("\n[");
	const jsonText = jsonStart === -1 ? output : output.slice(jsonStart + 1);
	if (!jsonText.startsWith("[")) {
		throw new Error(`npm pack did not print JSON output:\n${stdout}`);
	}
	return JSON.parse(jsonText);
};

await main();
