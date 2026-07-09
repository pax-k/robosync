#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createMdsyncMockServer } from "./lib/mdsync-mock-server.mjs";

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
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "mdsync-skill-smoke-"));
	const server = createMdsyncMockServer();
	try {
		const packDir = path.join(tempDir, "packs");
		const projectDir = path.join(tempDir, "project");
		await mkdir(packDir, { recursive: true });
		await mkdir(projectDir, { recursive: true });

		const contractsTarball = await packPackage("mdsync-contracts", packDir);
		const protocolTarball = await packPackage("ha2ha-protocol", packDir);
		const ha2haClientTarball = await packPackage("ha2ha-client", packDir);
		const ha2haSkillsTarball = await packPackage("ha2ha-skills", packDir);
		const mdsyncClientTarball = await packPackage("mdsync-client", packDir);
		const mdsyncSkillsTarball = await packPackage("mdsync-skills", packDir);

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
				contractsTarball,
				protocolTarball,
				ha2haClientTarball,
				ha2haSkillsTarball,
				mdsyncClientTarball,
				mdsyncSkillsTarball,
			],
			{ cwd: projectDir }
		);

		const installedSkill = await readFile(
			path.join(
				projectDir,
				"node_modules",
				"@mdsync",
				"skills",
				"skills",
				"mdsync",
				"SKILL.md"
			),
			"utf8"
		);
		assertNoRepoLocalPaths(installedSkill);
		assertNoTokenLikeSecrets(installedSkill);
		assertIncludes(
			installedSkill,
			"@mdsync/client",
			"MDSync client dependency"
		);
		assertIncludes(installedSkill, "MDSync product scope", "product boundary");
		assertIncludes(installedSkill, "baseVersion", "baseVersion guidance");
		assertIncludes(installedSkill, "version_conflict", "conflict guidance");
		assertIncludes(
			installedSkill,
			"secret-redaction",
			"secret redaction guidance"
		);
		assertIncludes(installedSkill, "edit token", "edit token guidance");

		const { baseUrl } = await server.start();
		await run(
			"node",
			[
				"--input-type=module",
				"--eval",
				[
					"import { createMdsyncClient } from '@mdsync/client';",
					"const setup = createMdsyncClient({ apiOrigin: process.env.MDSYNC_BASE_URL, actor: 'agent-context-a' });",
					"const taskContent = ['---', 'id: SKILL-001', 'title: Skill smoke', 'state: ready', 'owner: null', 'updated_by: agent-context-a', 'evidence: []', '---', '', '# Skill smoke', ''].join('\\n');",
					"const created = await setup.createWorkspace({ title: 'MDSync skill smoke', files: [{ path: 'STATUS.md', content: '# Status\\n' }, { path: 'tasks/SKILL-001.md', content: taskContent }] });",
					"if (!created.ok) throw new Error(JSON.stringify(created));",
					"const editToken = new URL(created.data.editUrl).searchParams.get('edit');",
					"if (!editToken) throw new Error('Missing edit token.');",
					"const client = createMdsyncClient({ apiOrigin: process.env.MDSYNC_BASE_URL, workspaceId: created.data.id, actor: 'agent-context-a', auth: { kind: 'edit-token', token: editToken } });",
					"const capabilities = await client.getCapabilities();",
					"if (!capabilities.ok) throw new Error(JSON.stringify(capabilities));",
					"const comment = await client.createComment({ path: 'STATUS.md', version: 1, body: 'Human-visible product comment.' });",
					"if (!comment.ok) throw new Error(JSON.stringify(comment));",
					"const ha2ha = client.createHa2haClient();",
					"if (!ha2ha.ok) throw new Error(JSON.stringify(ha2ha));",
					"const claim = await ha2ha.data.claimTask({ taskId: 'SKILL-001' });",
					"if (!claim.ok) throw new Error(JSON.stringify(claim));",
					"const evidence = await ha2ha.data.addEvidence({ taskId: 'SKILL-001', kind: 'skill-smoke', result: 'pass', body: 'Installed MDSync skill package dogfood passed.' });",
					"if (!evidence.ok) throw new Error(JSON.stringify(evidence));",
				].join("\n"),
			],
			{
				cwd: projectDir,
				env: { ...process.env, MDSYNC_BASE_URL: baseUrl },
			}
		);

		process.stdout.write(
			JSON.stringify(
				{ ok: true, package: "@mdsync/skills", skill: "mdsync" },
				null,
				2
			)
		);
		process.stdout.write("\n");
	} finally {
		await server.close().catch(() => undefined);
		await rm(tempDir, { force: true, recursive: true });
	}
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
	const forbidden = [
		"/Users/pax",
		"docs/v1/skills",
		"packages/mdsync-skills",
		"scripts/",
	];
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
