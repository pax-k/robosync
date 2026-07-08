import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
	createHa2haClient,
	createHttpTransport,
	createLocalFolderTransport,
} from "./index";

const FIXTURE_DIR = path.resolve("../ha2ha-skills/fixtures/minimal-workspace");
const FIXED_CLOCK = () => new Date("2026-07-08T00:00:00.000Z");
const CLAIMED_STATE_PATTERN = /state: claimed/u;
const TYPECHECK_EVIDENCE_PATTERN = /evidence\/SKILL-001\/typecheck\.md/u;

test("local folder client claims tasks and writes evidence records", async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "ha2ha-client-test-"));
	try {
		await cp(FIXTURE_DIR, tempDir, { recursive: true });
		const client = createHa2haClient({
			actor: "agent-context-a",
			clock: FIXED_CLOCK,
			transport: createLocalFolderTransport({ rootDir: tempDir }),
		});

		const claim = await client.claimTask({ taskId: "SKILL-001" });
		assert.equal(claim.ok, true, JSON.stringify(claim, null, 2));
		if (!claim.ok) {
			return;
		}
		assert.equal(claim.data.version, 2);

		const evidence = await client.addEvidence({
			body: "Typecheck passed.",
			kind: "typecheck",
			result: "pass",
			taskId: "SKILL-001",
		});
		assert.equal(evidence.ok, true, JSON.stringify(evidence, null, 2));

		const decision = await client.recordDecision({
			body: "Keep the package protocol-only.",
			title: "Protocol Skill Boundary",
		});
		assert.equal(decision.ok, true, JSON.stringify(decision, null, 2));

		const handoff = await client.writeHandoff({
			body: "Ready for review.",
			taskId: "SKILL-001",
		});
		assert.equal(handoff.ok, true, JSON.stringify(handoff, null, 2));

		const validation = await client.validateWorkspace();
		assert.equal(validation.ok, true, JSON.stringify(validation, null, 2));
		if (validation.ok) {
			assert.equal(validation.data.ok, true);
		}

		const task = await readFile(
			path.join(tempDir, "tasks", "SKILL-001.md"),
			"utf8"
		);
		assert.match(task, CLAIMED_STATE_PATTERN);
		assert.match(task, TYPECHECK_EVIDENCE_PATTERN);
	} finally {
		await rm(tempDir, { force: true, recursive: true });
	}
});

test("local folder client returns typed task ownership errors", async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "ha2ha-client-test-"));
	try {
		await cp(FIXTURE_DIR, tempDir, { recursive: true });
		const firstClient = createHa2haClient({
			actor: "agent-context-a",
			transport: createLocalFolderTransport({ rootDir: tempDir }),
		});
		const secondClient = createHa2haClient({
			actor: "agent-context-b",
			transport: createLocalFolderTransport({ rootDir: tempDir }),
		});

		assert.equal(
			(await firstClient.claimTask({ taskId: "SKILL-001" })).ok,
			true
		);
		const takeover = await secondClient.claimTask({ taskId: "SKILL-001" });

		assert.equal(takeover.ok, false);
		if (!takeover.ok) {
			assert.equal(takeover.error.code, "task_owned");
		}
	} finally {
		await rm(tempDir, { force: true, recursive: true });
	}
});

test("HTTP transport exposes version conflict target coordinates", async () => {
	const client = createHa2haClient({
		actor: "agent-context-a",
		transport: createHttpTransport({
			baseUrl: "http://mock.local",
			fetch: createConflictFetch(),
			workspaceId: "workspace-http",
		}),
	});

	const result = await client.writeFile({
		baseVersion: 1,
		content: "# Status\n",
		path: "STATUS.md",
	});

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(result.error.code, "version_conflict");
		assert.equal(result.error.latest?.workspaceId, "workspace-http");
		assert.equal(result.error.latest?.path, "STATUS.md");
		assert.equal(result.error.latest?.version, 2);
	}
});

const createConflictFetch = (): typeof fetch =>
	((input, init) => {
		const url = new URL(String(input));
		if (
			init?.method === "PUT" &&
			url.pathname === "/api/workspaces/workspace-http/files"
		) {
			return Promise.resolve(
				new Response(
					JSON.stringify({
						error: "version_conflict",
						latest: {
							content: "# Latest\n",
							contentType: "text/markdown; charset=utf-8",
							path: "STATUS.md",
							updatedAt: "2026-07-08T00:00:00.000Z",
							updatedBy: "agent-context-b",
							version: 2,
							workspaceId: "workspace-http",
						},
						message: "File changed since baseVersion.",
					}),
					{
						headers: { "Content-Type": "application/json" },
						status: 409,
					}
				)
			);
		}
		return Promise.resolve(
			new Response(JSON.stringify({ error: "not_found" }), {
				headers: { "Content-Type": "application/json" },
				status: 404,
			})
		);
	}) as typeof fetch;
