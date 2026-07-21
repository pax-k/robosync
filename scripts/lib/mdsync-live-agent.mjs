import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { RELEASE_COMMIT, RELEASE_TAG } from "./mdsync-live-api.mjs";

const ROLE_TIMEOUT_MS = 5 * 60 * 1000;
const EXPECTED_DOMAINS = ["sync.ha2ha.md", "sync-api.ha2ha.md", "ha2ha.md"];

export const summarizeCodexEvents = (jsonl) => {
	const counts = new Map();
	for (const line of jsonl.split("\n").filter(Boolean)) {
		try {
			const event = JSON.parse(line);
			const itemType = event.item?.type;
			const key = itemType ? `${event.type}:${itemType}` : event.type;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		} catch {
			counts.set("invalid-jsonl", (counts.get("invalid-jsonl") ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([name, count]) => `${name}=${count}`)
		.join(",");
};

export const verifySkillPayloads = (skillPayloads) => {
	const combined = skillPayloads.map(({ text }) => text).join("\n");
	for (const { name, text } of skillPayloads) {
		assert.match(text, new RegExp(`^name: ${name}$`, "mu"));
	}
	for (const domain of EXPECTED_DOMAINS) {
		assert.ok(
			combined.includes(domain),
			`Installed skill bundle is missing ${domain}.`
		);
	}
};

const runCommand = ({ args, command, cwd, timeoutMs = ROLE_TIMEOUT_MS }) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, NO_COLOR: "1" },
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stderr = "";
		let stdout = "";
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
		}, timeoutMs);
		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			clearTimeout(timeout);
			resolve({ code, stderr, stdout, timedOut });
		});
	});

export const installSkills = async (directory) => {
	await mkdir(directory, { recursive: true });
	const initialized = await runCommand({
		args: ["init", "-q"],
		command: "git",
		cwd: directory,
	});
	assert.equal(initialized.code, 0, initialized.stderr);
	const installed = await runCommand({
		args: [
			"skill",
			"install",
			"pax-k/ha2ha-mdsync",
			"--all",
			"--agent",
			"codex",
			"--scope",
			"project",
			"--pin",
			RELEASE_TAG,
		],
		command: "gh",
		cwd: directory,
	});
	assert.equal(installed.code, 0, installed.stderr);
	assert.match(
		`${installed.stdout}\n${installed.stderr}`,
		new RegExp(RELEASE_COMMIT.slice(0, 8), "u")
	);
	const skillPayloads = await Promise.all(
		["ha2ha", "mdsync"].map(async (skill) => {
			const skillText = await readFile(
				path.join(directory, ".agents", "skills", skill, "SKILL.md"),
				"utf8"
			);
			return { name: skill, text: skillText };
		})
	);
	verifySkillPayloads(skillPayloads);
	await writeFile(
		path.join(directory, "INSTALL-PROVENANCE"),
		`${RELEASE_TAG}\n${RELEASE_COMMIT}\n`,
		{ mode: 0o600 }
	);
	return { stderr: installed.stderr, stdout: installed.stdout };
};

export const writeCapabilityFile = async (directory, payload) => {
	const target = path.join(directory, "capability.json");
	await writeFile(target, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
	await chmod(target, 0o600);
	return target;
};

export const writePublisherDriver = async (directory) => {
	const driver = `import assert from "node:assert/strict";
import { open, writeFile } from "node:fs/promises";

const attempted = await open("publisher-attempted", "wx", 0o600);
await attempted.close();
const discoveryResponse = await fetch("https://sync.ha2ha.md/.well-known/mdsync.json");
assert.equal(discoveryResponse.status, 200);
const discovery = await discoveryResponse.json();
assert.deepEqual(discovery, {
  apiOrigin: "https://sync-api.ha2ha.md",
  discoveryVersion: 1,
  product: "mdsync",
  webOrigin: "https://sync.ha2ha.md",
});
const task = (id, title) => ({
  content: ["---", \`id: \${id}\`, \`title: \${title}\`, "state: ready", "owner: null", "updated_by: live-publisher", "evidence: []", "---", "", \`# \${title}\`, ""].join("\\n"),
  contentType: "text/markdown; charset=utf-8",
  path: \`tasks/\${id}.md\`,
});
const response = await fetch(\`\${discovery.apiOrigin}/api/workspaces\`, {
  body: JSON.stringify({
    actor: "live-publisher",
    files: [task("LIVE-001", "Independent builder A"), task("LIVE-002", "Independent builder B"), task("LIVE-RACE", "Synchronized claim race")],
    protocol: { kind: "ha2ha", version: "1.0.0" },
    readAccess: "token",
    title: "Live Multi-Agent Skill Acceptance 2026-07-21",
    writeAccess: "token",
  }),
  headers: { "content-type": "application/json" },
  method: "POST",
});
assert.equal(response.status, 201, \`Workspace creation returned \${response.status}.\`);
const created = await response.json();
await writeFile("publisher-handoff.json", JSON.stringify({ viewerUrl: created.workspaceUrl, collaboratorUrl: created.editUrl, workspaceId: created.id }), { mode: 0o600 });
`;
	const target = path.join(directory, "publisher-once.mjs");
	await writeFile(target, driver, { mode: 0o700 });
	return target;
};

const outputSchema = {
	additionalProperties: false,
	properties: {
		checks: { items: { type: "string" }, type: "array" },
		outcome: { enum: ["pass", "fail"], type: "string" },
		result: { type: "string" },
		role: { type: "string" },
		summary: { type: "string" },
	},
	required: ["role", "outcome", "summary", "checks", "result"],
	type: "object",
};

export const runAgent = async ({ directory, prompt, role }) => {
	const schemaPath = path.join(directory, "output-schema.json");
	const lastMessagePath = path.join(directory, "last-message.json");
	await writeFile(schemaPath, `${JSON.stringify(outputSchema, null, 2)}\n`, {
		mode: 0o600,
	});
	const response = await runCommand({
		args: [
			"exec",
			"--ephemeral",
			"--json",
			"--ignore-user-config",
			"--ignore-rules",
			"--sandbox",
			"danger-full-access",
			"-c",
			'model_reasoning_effort="medium"',
			"-c",
			"features.apps=false",
			"-c",
			"features.plugins=false",
			"-c",
			"features.memory_tool=false",
			"-c",
			"features.browser=false",
			"-c",
			"features.multi_agent=false",
			"--output-schema",
			schemaPath,
			"--output-last-message",
			lastMessagePath,
			prompt,
		],
		command: "codex",
		cwd: directory,
	}).catch((error) => {
		throw new Error(`${role}: ${error.message}`, { cause: error });
	});
	const lastMessage = await readFile(lastMessagePath, "utf8").catch(() => "");
	if (response.timedOut) {
		throw new Error(
			`${role}: codex timed out after ${ROLE_TIMEOUT_MS}ms; events=${summarizeCodexEvents(response.stdout)}`
		);
	}
	assert.equal(
		response.code,
		0,
		`${role} failed: ${response.stderr}\n${lastMessage}`
	);
	const parsed = JSON.parse(lastMessage);
	assert.equal(parsed.role, role);
	assert.equal(parsed.outcome, "pass", `${role}: ${parsed.summary}`);
	return { ...response, lastMessage, parsed, role };
};

export const basePrompt = ({ role, skill }) => `
You are the ${role} in a production acceptance test. Use the installed ${skill} skill and read it fully, including its directly linked references, before acting.

Hard boundaries:
- Work only inside this isolated temporary repository and against the live origins discovered from the supplied URL.
- Never search for, open, or mention any robosync checkout, npm workspace package, existing helper script, memory, browser, plugin, app, or sub-agent.
- Use raw HTTPS via a small local Node .mjs file when the packaged runtime is unavailable. Never print a capability URL, token, Authorization value, or response containing one.
- Read capability.json only from code at runtime. Do not interpolate its contents into shell commands, logs, final output, comments, workspace files, evidence, or handoffs.
- Before mutation, privately establish the skill safety envelope. Every existing-file write must include the observed baseVersion. Stop after any second conflict.
- Act immediately after reading the required skill material. Create at most one local Node script, make at most one source-file edit, and run it once. Do not add packages, tests, documentation, or unrelated checks.
- Your final structured JSON must be sanitized. Set role exactly to ${role}; outcome pass only after the requested observable result; result to the requested terse classification.
`;
