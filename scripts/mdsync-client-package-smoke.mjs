#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

const main = async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "mdsync-client-smoke-"));
	const server = createMdsyncMockServer();
	try {
		const packDir = path.join(tempDir, "packs");
		const projectDir = path.join(tempDir, "project");
		await mkdir(packDir, { recursive: true });
		await mkdir(projectDir, { recursive: true });

		const contractsTarball = await packPackage("mdsync-contracts", packDir);
		const protocolTarball = await packPackage("ha2ha-protocol", packDir);
		const ha2haClientTarball = await packPackage("ha2ha-client", packDir);
		const mdsyncClientTarball = await packPackage("mdsync-client", packDir);

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
				mdsyncClientTarball,
			],
			{ cwd: projectDir }
		);

		const { baseUrl } = await server.start();
		await run(
			"node",
			[
				"--input-type=module",
				"--eval",
				[
					"import { createMdsyncClient } from '@mdsync/client';",
					"const setup = createMdsyncClient({ apiOrigin: process.env.MDSYNC_BASE_URL, actor: 'agent-context-a' });",
					"const taskContent = ['---', 'id: SMOKE-001', 'title: Smoke task', 'state: ready', 'owner: null', 'updated_by: agent-context-a', 'evidence: []', '---', '', '# Smoke task', ''].join('\\n');",
					"const created = await setup.createWorkspace({",
					"  title: 'MDSync client smoke',",
					"  files: [",
					"    { path: 'STATUS.md', content: '# Status\\n' },",
					"    { path: 'tasks/SMOKE-001.md', content: taskContent },",
					"  ],",
					"});",
					"if (!created.ok) throw new Error(JSON.stringify(created));",
					"const editToken = new URL(created.data.editUrl).searchParams.get('edit');",
					"if (!editToken) throw new Error('Missing edit token.');",
					"const client = createMdsyncClient({ apiOrigin: process.env.MDSYNC_BASE_URL, workspaceId: created.data.id, actor: 'agent-context-a', auth: { kind: 'edit-token', token: editToken } });",
					"const write = await client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# Status\\n\\nUpdated.\\n' });",
					"if (!write.ok) throw new Error(JSON.stringify(write));",
					"const stale = await client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# stale\\n' });",
					"if (stale.ok || stale.error.code !== 'version_conflict') throw new Error(JSON.stringify(stale));",
					"const comment = await client.createComment({ path: 'STATUS.md', version: 1, body: 'Review anchored to v1.', selector: { line: 1 } });",
					"if (!comment.ok) throw new Error(JSON.stringify(comment));",
					"const resolved = await client.resolveComment({ commentId: comment.data.id });",
					"if (!resolved.ok) throw new Error(JSON.stringify(resolved));",
					"const stats = await client.getAdminStats();",
					"if (!stats.ok) throw new Error(JSON.stringify(stats));",
					"const exported = await client.exportWorkspace();",
					"if (!(exported.ok && exported.data.format === 'mdsync.workspace-export.v1')) throw new Error(JSON.stringify(exported));",
					"const imported = await client.importWorkspace(exported.data);",
					"if (!imported.ok) throw new Error(JSON.stringify(imported));",
					"const retention = await client.getRetention();",
					"if (!retention.ok) throw new Error(JSON.stringify(retention));",
					"const prune = await client.pruneRetention({ before: '2026-07-09T00:00:00.000Z' });",
					"if (!prune.ok) throw new Error(JSON.stringify(prune));",
					"const ha2ha = client.createHa2haClient();",
					"if (!ha2ha.ok) throw new Error(JSON.stringify(ha2ha));",
					"const claim = await ha2ha.data.claimTask({ taskId: 'SMOKE-001' });",
					"if (!claim.ok) throw new Error(JSON.stringify(claim));",
					"const evidence = await ha2ha.data.addEvidence({ taskId: 'SMOKE-001', kind: 'client-smoke', result: 'pass', body: 'MDSync client smoke passed.' });",
					"if (!evidence.ok) throw new Error(JSON.stringify(evidence));",
				].join("\n"),
			],
			{
				cwd: projectDir,
				env: { ...process.env, MDSYNC_BASE_URL: baseUrl },
			}
		);

		process.stdout.write(
			JSON.stringify({ ok: true, package: "@mdsync/client" }, null, 2)
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
