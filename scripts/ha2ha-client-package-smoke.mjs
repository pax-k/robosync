#!/usr/bin/env node
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createHa2haMockServer } from "./lib/ha2ha-mock-server.mjs";

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	".."
);
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");
const TIMEOUT_MS = 120_000;

const main = async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "ha2ha-client-smoke-"));
	const server = createHa2haMockServer();
	try {
		const packDir = path.join(tempDir, "packs");
		const projectDir = path.join(tempDir, "project");
		await mkdir(packDir, { recursive: true });
		await mkdir(projectDir, { recursive: true });

		const protocolTarball = await packPackage("ha2ha-protocol", packDir);
		const clientTarball = await packPackage("ha2ha-client", packDir);

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
				clientTarball,
			],
			{
				cwd: projectDir,
			}
		);

		await cp(
			path.join(PACKAGES_DIR, "ha2ha-skills", "fixtures", "minimal-workspace"),
			path.join(projectDir, "fixture"),
			{ recursive: true }
		);

		const { baseUrl, workspaceId } = await server.start();
		await run(
			"node",
			[
				"--input-type=module",
				"--eval",
				[
					"import { createHa2haClient, createHttpTransport, createLocalFolderTransport } from '@ha2ha/client';",
					"const httpClient = createHa2haClient({",
					"  actor: 'agent-context-a',",
					`  transport: createHttpTransport({ baseUrl: '${baseUrl}', workspaceId: '${workspaceId}' }),`,
					"});",
					"const listing = await httpClient.listWorkspace();",
					"if (!listing.ok) throw new Error(JSON.stringify(listing));",
					"const localClient = createHa2haClient({",
					"  actor: 'agent-context-a',",
					"  clock: () => new Date('2026-07-08T00:00:00.000Z'),",
					"  transport: createLocalFolderTransport({ rootDir: './fixture' }),",
					"});",
					"const claim = await localClient.claimTask({ taskId: 'SKILL-001' });",
					"if (!claim.ok) throw new Error(JSON.stringify(claim));",
					"const evidence = await localClient.addEvidence({ taskId: 'SKILL-001', kind: 'client-smoke', result: 'pass' });",
					"if (!evidence.ok) throw new Error(JSON.stringify(evidence));",
					"const validation = await localClient.validateWorkspace();",
					"if (!(validation.ok && validation.data.ok)) throw new Error(JSON.stringify(validation));",
				].join("\n"),
			],
			{
				cwd: projectDir,
			}
		);

		process.stdout.write(
			JSON.stringify(
				{
					ok: true,
					package: "@ha2ha/client",
				},
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
