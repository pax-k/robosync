import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import {
	HA2HA_CONFLICT,
	HA2HA_EVENT_TYPES,
	HA2HA_HEADERS,
	HA2HA_PATHS,
	HA2HA_TASK_STATES,
} from "./constants";
import {
	ha2haEvidenceMetadataSchema,
	ha2haTargetCoordinateSchema,
	ha2haTaskFrontmatterSchema,
	isHa2haWorkspacePath,
} from "./schemas";
import { HA2HA_VALIDATION_RULES, validateHa2haWorkspace } from "./validator";

const EXAMPLES_DIR = path.resolve("examples");

const validFixtures = [
	"valid/event-history-workspace",
	"valid/minimal-workspace",
	"valid/multi-participant-task-workspace",
] as const;

const invalidFixtures = [
	{
		path: "invalid/invalid-claim-metadata",
		ruleId: HA2HA_VALIDATION_RULES.invalidClaimMetadata,
	},
	{
		path: "invalid/invalid-conflict-response",
		ruleId: HA2HA_VALIDATION_RULES.invalidConflictResponse,
	},
	{
		path: "invalid/invalid-evidence-metadata",
		ruleId: HA2HA_VALIDATION_RULES.invalidEvidenceMetadata,
	},
	{
		path: "invalid/invalid-target-coordinate",
		ruleId: HA2HA_VALIDATION_RULES.invalidTargetCoordinate,
	},
	{
		path: "invalid/invalid-task-state",
		ruleId: HA2HA_VALIDATION_RULES.invalidTaskFrontmatter,
	},
	{
		path: "invalid/missing-actor-file-write",
		ruleId: HA2HA_VALIDATION_RULES.missingActor,
	},
	{
		path: "invalid/missing-manifest",
		ruleId: HA2HA_VALIDATION_RULES.missingManifest,
	},
] as const;

test("valid examples pass HA2HA validation", async () => {
	const results = await Promise.all(
		validFixtures.map((fixture) =>
			validateHa2haWorkspace(path.join(EXAMPLES_DIR, fixture))
		)
	);
	for (const result of results) {
		assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
	}
});

test("invalid examples fail with stable rule ids", async () => {
	const results = await Promise.all(
		invalidFixtures.map(async (fixture) => ({
			fixture,
			result: await validateHa2haWorkspace(
				path.join(EXAMPLES_DIR, fixture.path)
			),
		}))
	);
	for (const { fixture, result } of results) {
		assert.equal(result.ok, false, fixture.path);
		assert.equal(
			result.issues.some((issue) => issue.ruleId === fixture.ruleId),
			true,
			JSON.stringify(result.issues, null, 2)
		);
	}
});

test("workspace path validation accepts only normalized relative paths", () => {
	const validPaths = [
		"README.md",
		"tasks/RS-001.md",
		"evidence/RS-001/test-output.md",
	] as const;
	const invalidPaths = [
		"",
		" README.md",
		"README.md ",
		"/README.md",
		"tasks//RS-001.md",
		"tasks/../README.md",
		"tasks\\RS-001.md",
	] as const;

	for (const workspacePath of validPaths) {
		assert.equal(isHa2haWorkspacePath(workspacePath), true, workspacePath);
	}
	for (const workspacePath of invalidPaths) {
		assert.equal(isHa2haWorkspacePath(workspacePath), false, workspacePath);
	}
});

test("target coordinates require workspace id, path, and positive version", () => {
	assert.equal(
		ha2haTargetCoordinateSchema.safeParse({
			path: "README.md",
			version: 1,
			workspaceId: "workspace-1",
		}).success,
		true
	);

	const result = ha2haTargetCoordinateSchema.safeParse({
		path: "../README.md",
		version: 0,
		workspaceId: "",
	});

	assert.equal(result.success, false);
	if (!result.success) {
		assert.equal(result.error.issues.length, 3);
	}
});

test("evidence metadata requires a task or target", () => {
	const baseEvidence = {
		actor: "codex-pax",
		created_at: "2026-07-08T00:00:00Z",
		id: "ev-RS-001-test",
		kind: "test",
		result: "pass",
	} as const;

	assert.equal(
		ha2haEvidenceMetadataSchema.safeParse({
			...baseEvidence,
			task: "RS-001",
		}).success,
		true
	);
	assert.equal(
		ha2haEvidenceMetadataSchema.safeParse({
			...baseEvidence,
			target: {
				path: "README.md",
				version: 1,
				workspaceId: "workspace-1",
			},
		}).success,
		true
	);
	assert.equal(
		ha2haEvidenceMetadataSchema.safeParse(baseEvidence).success,
		false
	);
});

test("task frontmatter rejects unknown states", () => {
	assert.equal(
		ha2haTaskFrontmatterSchema.safeParse({
			id: "RS-001",
			state: "ready",
			title: "Valid task",
		}).success,
		true
	);
	assert.equal(
		ha2haTaskFrontmatterSchema.safeParse({
			id: "RS-001",
			state: "todo",
			title: "Invalid task",
		}).success,
		false
	);
});

test("public constants preserve protocol contract strings", () => {
	assert.deepEqual(HA2HA_PATHS, {
		decisions: "decisions/",
		evidence: "evidence/",
		logs: "logs/",
		manifestMarkdown: "HA2HA.md",
		participants: "participants/",
		status: "STATUS.md",
		tasks: "tasks/",
		workspaceManifest: ".ha2ha/workspace.json",
	});
	assert.deepEqual(HA2HA_HEADERS, {
		fileVersion: "X-HA2HA-File-Version",
		path: "X-HA2HA-Path",
	});
	assert.deepEqual(HA2HA_TASK_STATES, [
		"ready",
		"claimed",
		"working",
		"blocked",
		"review",
		"done",
		"abandoned",
	]);
	assert.deepEqual(HA2HA_EVENT_TYPES, {
		evidenceAdded: "evidence.added",
		fileCreated: "file.created",
		fileDeleted: "file.deleted",
		fileUpdated: "file.updated",
		taskClaimed: "task.claimed",
	});
	assert.deepEqual(HA2HA_CONFLICT, {
		error: "version_conflict",
		message: "File changed since baseVersion.",
	});
});
