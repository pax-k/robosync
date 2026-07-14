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
					"import { createMdsyncClient, createMdsyncClientFromUrl } from '@mdsync/client';",
					"const setup = createMdsyncClient({ apiOrigin: process.env.MDSYNC_BASE_URL, actor: 'agent-context-a' });",
					"const taskContent = ['---', 'id: SMOKE-001', 'title: Smoke task', 'state: ready', 'owner: null', 'updated_by: agent-context-a', 'evidence: []', '---', '', '# Smoke task', ''].join('\\n');",
					"const created = await setup.createHa2haWorkspace({",
					"  actor: 'agent-context-a',",
					"  title: 'MDSync client smoke',",
					"  files: [{ path: 'tasks/SMOKE-001.md', content: taskContent }],",
					"});",
					"if (!created.ok) throw new Error(JSON.stringify(created));",
					"if (!(created.data.workspaceUrl && created.data.editUrl)) throw new Error('Missing capability links.');",
					"const viewer = await createMdsyncClientFromUrl({ actor: 'agent-context-viewer', url: created.data.workspaceUrl });",
					"if (!viewer.ok || viewer.data.access !== 'read') throw new Error(JSON.stringify(viewer));",
					"const manifest = await viewer.data.client.readFile('.ha2ha/workspace.json');",
					"if (!(manifest.ok && manifest.data.content.includes('baseVersion-required'))) throw new Error(JSON.stringify(manifest));",
					"const denied = await viewer.data.client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# denied\\n' });",
					"if (denied.ok || denied.error.code !== 'missing_token') throw new Error(JSON.stringify(denied));",
					"const collaborator = await createMdsyncClientFromUrl({ actor: 'agent-context-b', url: created.data.editUrl });",
					"if (!collaborator.ok || collaborator.data.access !== 'edit') throw new Error(JSON.stringify(collaborator));",
					"const client = collaborator.data.client;",
					"const overview = await client.getOverview();",
					"if (!(overview.ok && overview.data.tasks.items[0]?.id === 'SMOKE-001')) throw new Error(JSON.stringify(overview));",
					"const ha2ha = client.createHa2haClient();",
					"if (!ha2ha.ok) throw new Error(JSON.stringify(ha2ha));",
					"const claim = await ha2ha.data.claimTask({ taskId: 'SMOKE-001' });",
					"if (!claim.ok) throw new Error(JSON.stringify(claim));",
					"const evidence = await ha2ha.data.addEvidence({ taskId: 'SMOKE-001', kind: 'client-smoke', result: 'pass', body: 'MDSync client smoke passed.' });",
					"if (!evidence.ok) throw new Error(JSON.stringify(evidence));",
					"const evidenceFile = await client.readFile(evidence.data.evidence.path);",
					"if (!evidenceFile.ok) throw new Error(JSON.stringify(evidenceFile));",
					"if (evidenceFile.data.content.includes(created.data.workspaceUrl) || evidenceFile.data.content.includes(created.data.editUrl)) throw new Error('Capability leaked into evidence.');",
					"const write = await client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# Status\\n\\nUpdated by Agent B.\\n' });",
					"if (!write.ok) throw new Error(JSON.stringify(write));",
					"const observer = await createMdsyncClientFromUrl({ actor: 'agent-context-a', url: created.data.editUrl });",
					"if (!observer.ok) throw new Error(JSON.stringify(observer));",
					"const observed = await observer.data.client.readFile('tasks/SMOKE-001.md');",
					"if (!(observed.ok && observed.data.content.includes('owner: agent-context-b'))) throw new Error(JSON.stringify(observed));",
					"const stale = await observer.data.client.writeFile({ path: 'STATUS.md', baseVersion: 1, content: '# stale\\n' });",
					"if (stale.ok || stale.error.code !== 'version_conflict' || !stale.error.latest?.content.includes('Updated by Agent B')) throw new Error(JSON.stringify(stale));",
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
