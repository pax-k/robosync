import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
	summarizeCodexEvents,
	verifySkillPayloads,
} from "./mdsync-live-agent.mjs";
import {
	findCapabilityLeaks,
	parseCapabilityUrl,
	parseTask,
} from "./mdsync-live-api.mjs";

test("parseCapabilityUrl extracts only the requested capability", () => {
	const parsed = parseCapabilityUrl(
		"https://sync.ha2ha.md/w/ws_test?k=reader_secret_123456",
		"k"
	);
	assert.equal(parsed.workspaceId, "ws_test");
	assert.equal(parsed.token, "reader_secret_123456");
});

test("parseTask reads ownership and inline evidence", () => {
	const task = parseTask(
		"---\nid: LIVE-001\nstate: done\nowner: live-builder-a\nupdated_by: live-builder-a\nevidence: [evidence/LIVE-001/builder-a.md]\n---\n"
	);
	assert.deepEqual(task, {
		evidence: ["evidence/LIVE-001/builder-a.md"],
		id: "LIVE-001",
		owner: "live-builder-a",
		state: "done",
		updatedBy: "live-builder-a",
	});
});

test("findCapabilityLeaks detects exact and shaped secrets", () => {
	assert.deepEqual(
		findCapabilityLeaks(
			[{ label: "clean", text: "no secrets" }],
			["secret-value"]
		),
		[]
	);
	assert.deepEqual(
		findCapabilityLeaks(
			[{ label: "exact", text: "secret-value" }],
			["secret-value"]
		),
		["exact:exact-secret"]
	);
	assert.deepEqual(
		findCapabilityLeaks(
			[{ label: "shape", text: "?edit=abcdefghijklmnop" }],
			[]
		),
		["shape:capability-pattern"]
	);
});

test("skill provenance validates canonical domains across the released bundle", () => {
	assert.doesNotThrow(() =>
		verifySkillPayloads([
			{ name: "ha2ha", text: "---\nname: ha2ha\n---\nhttps://ha2ha.md\n" },
			{
				name: "mdsync",
				text: "---\nname: mdsync\n---\nhttps://sync.ha2ha.md https://sync-api.ha2ha.md\n",
			},
		])
	);
});

test("parallel builder instructions do not require stale adjacent state", async () => {
	const driver = await readFile(
		path.resolve(import.meta.dirname, "mdsync-live-drivers.mjs"),
		"utf8"
	);
	assert.ok(!driver.includes("adjacent task remains ready/unowned"));
	assert.ok(
		driver.includes("assert.notEqual(taskOwner(adjacent.content), actor)")
	);
});

test("Codex timeout diagnostics expose event types without event content", () => {
	const summary = summarizeCodexEvents(
		'{"type":"item.completed","item":{"type":"command_execution","command":"secret"}}\n' +
			'{"type":"item.completed","item":{"type":"command_execution","command":"secret-two"}}\n'
	);
	assert.equal(summary, "item.completed:command_execution=2");
	assert.ok(!summary.includes("secret"));
});

test("race barrier leaves setup time inside the five-minute role budget", async () => {
	const harness = await readFile(
		path.resolve(import.meta.dirname, "..", "mdsync-live-skills.mjs"),
		"utf8"
	);
	assert.ok(harness.includes("const RACE_BARRIER_TIMEOUT_MS = 4 * 60 * 1000"));
	assert.ok(!harness.includes("timeoutMs = 90_000"));
});

test("publisher uses an atomic one-shot driver and timeout recovery", async () => {
	const [agentRuntime, harness] = await Promise.all([
		readFile(
			path.resolve(import.meta.dirname, "mdsync-live-agent.mjs"),
			"utf8"
		),
		readFile(
			path.resolve(import.meta.dirname, "..", "mdsync-live-skills.mjs"),
			"utf8"
		),
	]);
	assert.ok(agentRuntime.includes('open("publisher-attempted", "wx", 0o600)'));
	assert.ok(
		harness.includes(
			"Do not edit it and do not make any direct production request"
		)
	);
	assert.ok(harness.includes("recovered?.collaboratorUrl"));
});

test("secure handoff files use explicit capability labels", async () => {
	const harness = await readFile(
		path.resolve(import.meta.dirname, "..", "mdsync-live-skills.mjs"),
		"utf8"
	);
	assert.ok(harness.includes("{ viewerUrl }"));
	assert.ok(harness.includes("collaboratorUrl: handoff.collaboratorUrl"));
	assert.ok(!harness.includes("{ url: viewerUrl }"));
});

test("collaborator roles use edit authority as a Bearer credential", async () => {
	const driver = await readFile(
		path.resolve(import.meta.dirname, "mdsync-live-drivers.mjs"),
		"utf8"
	);
	assert.ok(driver.includes("authorization:"));
	assert.ok(driver.includes("Bearer"));
	assert.ok(
		driver.includes("const editToken = capabilityUrl.searchParams.get")
	);
	assert.ok(driver.includes("const viewerQuery = viewerToken"));
});

test("product and portable comment event names stay separated", async () => {
	const [driver, harness] = await Promise.all([
		readFile(
			path.resolve(import.meta.dirname, "mdsync-live-drivers.mjs"),
			"utf8"
		),
		readFile(
			path.resolve(import.meta.dirname, "..", "mdsync-live-skills.mjs"),
			"utf8"
		),
	]);
	assert.ok(driver.includes("comment[.]created"));
	assert.ok(driver.includes("comment[._]"));
	assert.ok(harness.includes('activityText.includes("comment.created")'));
});

test("independent Viewer verification uses the k query transport", async () => {
	const api = await readFile(
		path.resolve(import.meta.dirname, "mdsync-live-api.mjs"),
		"utf8"
	);
	assert.ok(api.includes('requestUrl.searchParams.set("k", readToken)'));
	assert.ok(api.includes("readToken: token"));
});
