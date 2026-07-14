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
			JSON.stringify(
				{
					dependencies: { "@mdsync/skills": `file:${mdsyncSkillsTarball}` },
					packageManager: "pnpm@10.32.1",
					pnpm: {
						overrides: {
							"@ha2ha/client": `file:${ha2haClientTarball}`,
							"@ha2ha/protocol": `file:${protocolTarball}`,
							"@ha2ha/skills": `file:${ha2haSkillsTarball}`,
							"@mdsync/client": `file:${mdsyncClientTarball}`,
							"@mdsync/contracts": `file:${contractsTarball}`,
						},
					},
					private: true,
					type: "module",
				},
				null,
				2
			)
		);
		await run(
			"pnpm",
			[
				"install",
				"--ignore-scripts",
				"--config.auto-install-peers=false",
				"--config.node-linker=isolated",
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
			"@mdsync/skills/runtime",
			"MDSync runtime adapter"
		);
		assertIncludes(installedSkill, "MDSync product scope", "product boundary");
		assertIncludes(installedSkill, "baseVersion", "baseVersion guidance");
		assertIncludes(installedSkill, "version_conflict", "conflict guidance");
		assertIncludes(
			installedSkill,
			"createHa2haWorkspace()",
			"conformant publish workflow"
		);
		assertIncludes(
			installedSkill,
			"createMdsyncClientFromUrl()",
			"URL-only join workflow"
		);
		assertIncludes(installedSkill, "Viewer URL", "viewer handoff label");
		assertIncludes(
			installedSkill,
			"Collaborator URL",
			"collaborator handoff label"
		);
		assertIncludes(
			installedSkill,
			"secret-redaction",
			"secret redaction guidance"
		);
		assertIncludes(installedSkill, "edit token", "edit token guidance");
		const installedHandoffReference = await readFile(
			path.join(
				projectDir,
				"node_modules",
				"@mdsync",
				"skills",
				"skills",
				"mdsync",
				"references",
				"url-handoff.md"
			),
			"utf8"
		);
		assertNoRepoLocalPaths(installedHandoffReference);
		assertNoTokenLikeSecrets(installedHandoffReference);
		assertIncludes(
			installedHandoffReference,
			"HTTP Fallback",
			"HTTP fallback workflow"
		);
		assertIncludes(
			installedHandoffReference,
			"baseVersion-required",
			"exact conflict policy"
		);
		await readFile(
			path.join(
				projectDir,
				"node_modules",
				"@mdsync",
				"skills",
				"dist",
				"runtime.mjs"
			),
			"utf8"
		);

		const { baseUrl } = await server.start();
		await run(
			"node",
			[
				"--input-type=module",
				"--eval",
				[
					"import { createMdsyncClient, createMdsyncClientFromUrl, validateMdsyncHa2haManifest } from '@mdsync/skills/runtime';",
					"const setup = createMdsyncClient({ apiOrigin: process.env.MDSYNC_BASE_URL, actor: 'agent-context-a' });",
					"const taskContent = ['---', 'id: SKILL-001', 'title: Skill smoke', 'state: ready', 'owner: null', 'updated_by: agent-context-a', 'evidence: []', '---', '', '# Skill smoke', ''].join('\\n');",
					"const created = await setup.createHa2haWorkspace({ actor: 'agent-context-a', title: 'MDSync skill smoke', files: [{ path: 'tasks/SKILL-001.md', content: taskContent }] });",
					"if (!created.ok) throw new Error(JSON.stringify(created));",
					"if (!(created.data.workspaceUrl && created.data.editUrl)) throw new Error('Missing handoff links.');",
					"const viewer = await createMdsyncClientFromUrl({ actor: 'coworker-viewer', url: created.data.workspaceUrl });",
					"if (!viewer.ok || viewer.data.access !== 'read') throw new Error(JSON.stringify(viewer));",
					"const viewerRead = await viewer.data.client.readFile('HA2HA.md');",
					"if (!viewerRead.ok) throw new Error(JSON.stringify(viewerRead));",
					"const viewerWrite = await viewer.data.client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# denied\\n' });",
					"if (viewerWrite.ok || viewerWrite.error.code !== 'missing_token') throw new Error(JSON.stringify(viewerWrite));",
					"const collaborator = await createMdsyncClientFromUrl({ actor: 'agent-context-b', url: created.data.editUrl });",
					"if (!collaborator.ok || collaborator.data.access !== 'edit') throw new Error(JSON.stringify(collaborator));",
					"const client = collaborator.data.client;",
					"const manifest = await client.readFile('.ha2ha/workspace.json');",
					"if (!manifest.ok) throw new Error(JSON.stringify(manifest));",
					"const validatedManifest = validateMdsyncHa2haManifest({ content: manifest.data.content, workspaceId: collaborator.data.workspaceId });",
					"if (!validatedManifest.ok || validatedManifest.data.conflictPolicy !== 'baseVersion-required') throw new Error(JSON.stringify(validatedManifest));",
					"const ha2ha = client.createHa2haClient();",
					"if (!ha2ha.ok) throw new Error(JSON.stringify(ha2ha));",
					"const claim = await ha2ha.data.claimTask({ taskId: 'SKILL-001' });",
					"if (!claim.ok) throw new Error(JSON.stringify(claim));",
					"const evidence = await ha2ha.data.addEvidence({ taskId: 'SKILL-001', kind: 'skill-smoke', result: 'pass', body: 'Installed MDSync skill package dogfood passed.' });",
					"if (!evidence.ok) throw new Error(JSON.stringify(evidence));",
					"const evidenceFile = await client.readFile(evidence.data.evidence.path);",
					"if (!evidenceFile.ok) throw new Error(JSON.stringify(evidenceFile));",
					"if (evidenceFile.data.content.includes(created.data.workspaceUrl) || evidenceFile.data.content.includes(created.data.editUrl)) throw new Error('Capability leaked into generated evidence.');",
					"const statusWrite = await client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# Status\\n\\nAgent B coordinated this workspace.\\n' });",
					"if (!statusWrite.ok) throw new Error(JSON.stringify(statusWrite));",
					"const comment = await client.createComment({ path: 'STATUS.md', version: statusWrite.data.version, body: 'Ready for review.' });",
					"if (!comment.ok) throw new Error(JSON.stringify(comment));",
					"const resolved = await client.resolveComment({ commentId: comment.data.id });",
					"if (!resolved.ok) throw new Error(JSON.stringify(resolved));",
					"const activity = await client.listActivity();",
					"if (!activity.ok || !activity.data.items.some((item) => item.type === 'comment.created') || !activity.data.items.some((item) => item.type === 'comment.resolved')) throw new Error(JSON.stringify(activity));",
					"const events = await client.listEvents();",
					"if (!events.ok || events.data.events.some((event) => event.type.startsWith('comment.'))) throw new Error(JSON.stringify(events));",
					"const observer = await createMdsyncClientFromUrl({ actor: 'agent-context-a', url: created.data.editUrl });",
					"if (!observer.ok) throw new Error(JSON.stringify(observer));",
					"const observed = await observer.data.client.readFile('tasks/SKILL-001.md');",
					"if (!(observed.ok && observed.data.content.includes('owner: agent-context-b'))) throw new Error(JSON.stringify(observed));",
					"const stale = await observer.data.client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# stale\\n' });",
					"if (stale.ok || stale.error.code !== 'version_conflict') throw new Error(JSON.stringify(stale));",
					"if (!stale.error.latest || stale.error.latest.content !== '# Status\\n\\nAgent B coordinated this workspace.\\n') throw new Error('Latest content was not preserved.');",
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
