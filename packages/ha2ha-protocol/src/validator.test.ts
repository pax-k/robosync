import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

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
