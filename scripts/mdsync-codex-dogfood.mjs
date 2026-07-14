#!/usr/bin/env node
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
	createMdsyncClientFromUrl,
	validateMdsyncHa2haManifest,
} from "../packages/mdsync-client/dist/index.mjs";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const TIMEOUT_MS = 5 * 60 * 1000;
const apiOrigin = process.env.MDSYNC_BASE_URL?.trim();

if (!apiOrigin) {
	throw new Error("MDSYNC_BASE_URL is required for Codex dogfood.");
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "mdsync-codex-dogfood-"));
const handoffPath = path.join(tempDir, "capability-handoff.json");
const schemaPath = path.join(tempDir, "result-schema.json");
const outputs = [];

try {
	await chmod(tempDir, 0o700);
	await writeFile(handoffPath, "{}\n", { mode: 0o600 });
	await chmod(handoffPath, 0o600);
	await writeFile(
		schemaPath,
		`${JSON.stringify(
			{
				additionalProperties: false,
				properties: {
					outcome: { enum: ["pass", "fail"] },
					role: {
						enum: ["publisher", "viewer", "collaborator-reviewer", "conflict"],
					},
					summary: { type: "string" },
				},
				required: ["role", "outcome", "summary"],
				type: "object",
			},
			null,
			2
		)}\n`
	);

	await runAgent({
		prompt: rolePrompt("publisher", roleCommand("publisher")),
		role: "publisher",
	});
	await assertSecureHandoff();

	await runAgent({
		prompt: rolePrompt("viewer", roleCommand("viewer")),
		role: "viewer",
	});
	await runAgent({
		prompt: rolePrompt(
			"collaborator-reviewer",
			roleCommand("collaborator-reviewer")
		),
		role: "collaborator-reviewer",
	});
	await runAgent({
		prompt: rolePrompt("conflict", roleCommand("conflict")),
		role: "conflict",
	});

	const handoff = await readHandoff();
	assertNoCapabilityLeak(handoff);
	await verifyWorkspace(handoff);

	process.stdout.write(
		`${JSON.stringify(
			{
				capabilityFileMode: "0600",
				capabilityLeak: false,
				contexts: outputs.map(({ outcome, role }) => ({ outcome, role })),
				ok: true,
				workspaceId: handoff.workspaceId,
			},
			null,
			2
		)}\n`
	);
} finally {
	await rm(tempDir, { force: true, recursive: true });
}

function rolePrompt(role, task) {
	return [
		`Read only ${ROOT_DIR}/packages/mdsync-skills/skills/mdsync/SKILL.md and ${ROOT_DIR}/packages/mdsync-skills/skills/mdsync/references/url-handoff.md before acting.`,
		`You are the ${role} context in a controlled MDSync release dogfood.`,
		task,
		"Execute that exact command once. Do not inspect or edit repository files.",
		"Return only the required JSON result with no URLs, tokens, commands, or diagnostics.",
	].join("\n");
}

function roleCommand(role) {
	return `Run: node ${ROOT_DIR}/scripts/mdsync-codex-role.mjs ${role} ${handoffPath} ${apiOrigin}`;
}

async function runAgent({ prompt, role }) {
	const outputPath = path.join(tempDir, `${role}.json`);
	const { stderr, stdout } = await execFileWithClosedStdin(
		"codex",
		[
			"exec",
			"--json",
			"--ephemeral",
			"--enable",
			"fast_mode",
			"--disable",
			"apps",
			"--disable",
			"browser_use",
			"--disable",
			"computer_use",
			"--disable",
			"hooks",
			"--disable",
			"image_generation",
			"--disable",
			"in_app_browser",
			"--disable",
			"memories",
			"--disable",
			"multi_agent",
			"--disable",
			"plugins",
			"--disable",
			"workspace_dependencies",
			"--ignore-user-config",
			"--ignore-rules",
			"--skip-git-repo-check",
			"--sandbox",
			"danger-full-access",
			"--config",
			'approval_policy="never"',
			"--config",
			'model_reasoning_effort="low"',
			"--cd",
			tempDir,
			"--add-dir",
			ROOT_DIR,
			"--output-schema",
			schemaPath,
			"--output-last-message",
			outputPath,
			prompt,
		],
		{ cwd: tempDir, timeout: TIMEOUT_MS }
	);
	const outputText = await readFile(outputPath, "utf8").catch(() => {
		throw new Error(`${role} Codex context produced no final result.`);
	});
	const result = JSON.parse(outputText);
	if (result.role !== role || result.outcome !== "pass") {
		throw new Error(`${role} Codex context did not pass.`);
	}
	outputs.push({ outcome: result.outcome, outputText, role, stderr, stdout });
}

function execFileWithClosedStdin(file, args, options) {
	return new Promise((resolve, reject) => {
		const child = execFile(file, args, options, (error, stdout, stderr) => {
			if (error) {
				reject(error);
				return;
			}
			resolve({ stderr, stdout });
		});
		child.stdin?.end();
	});
}

async function assertSecureHandoff() {
	const handoff = await readHandoff();
	if (
		!(handoff.viewerUrl && handoff.collaboratorUrl && handoff.workspaceId) ||
		handoff.taskId !== "DOGFOOD-001"
	) {
		throw new Error("Publisher did not create a complete capability handoff.");
	}
}

async function readHandoff() {
	return JSON.parse(await readFile(handoffPath, "utf8"));
}

function assertNoCapabilityLeak(handoff) {
	const capabilityValues = [
		handoff.viewerUrl,
		handoff.collaboratorUrl,
		new URL(handoff.viewerUrl).searchParams.get("k"),
		new URL(handoff.collaboratorUrl).searchParams.get("edit"),
	].filter(Boolean);
	for (const output of outputs) {
		const captured = `${output.outputText}\n${output.stdout}\n${output.stderr}`;
		for (const capability of capabilityValues) {
			if (captured.includes(capability)) {
				throw new Error(`Capability leaked from the ${output.role} context.`);
			}
		}
	}
}

async function verifyWorkspace(handoff) {
	const connection = await createMdsyncClientFromUrl({
		actor: "dogfood-verifier",
		url: handoff.collaboratorUrl,
	});
	if (!connection.ok) {
		throw new Error(`Verifier join failed: ${connection.error.code}`);
	}
	const { client, workspaceId } = connection.data;
	const manifest = await client.readFile(".ha2ha/workspace.json");
	if (!manifest.ok) {
		throw new Error(`Verifier manifest read failed: ${manifest.error.code}`);
	}
	const validated = validateMdsyncHa2haManifest({
		content: manifest.data.content,
		workspaceId,
	});
	if (!validated.ok) {
		throw new Error(
			`Verifier manifest validation failed: ${validated.error.code}`
		);
	}
	const activity = await client.listActivity();
	const events = await client.listEvents();
	if (
		!(
			activity.ok &&
			events.ok &&
			activity.data.items.some((item) => item.type === "comment.created") &&
			activity.data.items.some((item) => item.type === "comment.resolved")
		) ||
		events.data.events.some((event) => event.type.startsWith("comment."))
	) {
		throw new Error("Verifier found an activity/event boundary failure.");
	}
	const listing = await client.listFiles();
	if (!listing.ok) {
		throw new Error(`Verifier listing failed: ${listing.error.code}`);
	}
	const capabilityValues = [handoff.viewerUrl, handoff.collaboratorUrl];
	const workspaceFiles = await Promise.all(
		listing.data.files.map(async (file) => ({
			current: await client.readFile(file.path),
			path: file.path,
		}))
	);
	for (const { current, path: filePath } of workspaceFiles) {
		if (
			current.ok &&
			capabilityValues.some((value) => current.data.content.includes(value))
		) {
			throw new Error(`Capability leaked into workspace file ${filePath}.`);
		}
	}
	const comments = await client.listComments();
	if (
		!comments.ok ||
		comments.data.comments.some((comment) =>
			capabilityValues.some((value) => comment.body.includes(value))
		)
	) {
		throw new Error("Capability leaked into workspace comments.");
	}
}
