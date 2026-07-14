import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import {
	HA2HA_V3_EXAMPLE_FIXTURES,
	HA2HA_V3_FAILURE_CLASSES,
	HA2HA_V3_PROFILES,
	HA2HA_V3_REQUIRED_FIRST_SLICE_METHODS,
} from "./v3-constants";
import {
	ha2haV3MethodContractSchema,
	ha2haV3ReviewCommentRecordSchema,
	ha2haV3TaskClaimRequestSchema,
	ha2haV3ValidationOutputSchema,
} from "./v3-schemas";
import { validateHa2haV3Workspace } from "./v3-validator";
import { HA2HA_VALIDATION_RULES } from "./validator";

const EXAMPLES_DIR = path.resolve("examples");

const validV3Fixtures = [
	"valid/v3-coordination-only",
	"valid/v3-trust-only",
	"valid/v3-evidence-review-only",
	"valid/v3-engineering-only",
	"valid/v3-governance-only",
	"valid/v3-methods-only",
	"valid/v3-engineering-team-workspace",
] as const;

const invalidV3Fixtures = [
	{
		path: "invalid/v3-missing-required-method",
		ruleId: HA2HA_VALIDATION_RULES.v3MissingRequiredMethod,
	},
	{
		path: "invalid/v3-blocked-completion",
		ruleId: HA2HA_VALIDATION_RULES.v3CompletionBlocked,
	},
	{
		path: "invalid/v3-provider-payload-leak",
		ruleId: HA2HA_VALIDATION_RULES.v3ProviderPayloadLeak,
	},
	{
		path: "invalid/v3-secret-leak",
		ruleId: HA2HA_VALIDATION_RULES.v3SecretLeak,
	},
] as const;

test("v3 valid fixtures pass claimed profile validation independently", async () => {
	const results = await Promise.all(
		validV3Fixtures.map(async (fixture) => ({
			fixture,
			result: await validateHa2haV3Workspace(path.join(EXAMPLES_DIR, fixture)),
		}))
	);
	for (const { fixture, result } of results) {
		assert.equal(
			result.ok,
			true,
			`${fixture}: ${JSON.stringify(result.issues, null, 2)}`
		);
		assert.equal(result.profiles.length > 0, true, fixture);
	}
});

test("v3 invalid fixtures fail with stable rule ids", async () => {
	const results = await Promise.all(
		invalidV3Fixtures.map(async (fixture) => ({
			fixture,
			result: await validateHa2haV3Workspace(
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

test("v3 constants expose required first-slice methods and failure classes", () => {
	assert.deepEqual(HA2HA_V3_REQUIRED_FIRST_SLICE_METHODS, [
		"workspace.validate",
		"task.claim",
		"task.handoff",
		"evidence.add",
		"review.comment",
	]);
	assert.deepEqual(HA2HA_V3_FAILURE_CLASSES, [
		"validation_failed",
		"version_conflict",
		"authority_denied",
		"state_conflict",
		"missing_evidence",
		"unresolved_review",
		"external_unavailable",
		"unsupported_profile",
		"human_input_required",
	]);
	assert.equal(HA2HA_V3_PROFILES.engineering, "ha2ha-engineering");
	assert.equal(
		HA2HA_V3_EXAMPLE_FIXTURES.includes("valid/v3-engineering-team-workspace"),
		true
	);
});

test("v3 method contracts require actor, authority, failures, and conformance", () => {
	assert.equal(
		ha2haV3MethodContractSchema.safeParse({
			allowedPaths: ["tasks/"],
			blockingFailures: ["version_conflict", "authority_denied"],
			conformance: ["baseVersion required"],
			emitsEvents: ["task.claimed"],
			emitsEvidence: false,
			failureClasses: ["version_conflict", "authority_denied"],
			idempotency: "required",
			inputSchema: "ha2haV3TaskClaimRequestSchema",
			name: "task.claim",
			outputSchema: "ha2haV3OperationRecordSchema",
			profile: "ha2ha-coordination",
			purpose: "Claim a task.",
			requiresActor: true,
			requiresAuthority: ["claim"],
			requiresBaseVersion: true,
			retry: "once-on-version-conflict",
			stateTransitions: ["ready->claimed"],
		}).success,
		true
	);
	assert.equal(
		ha2haV3MethodContractSchema.safeParse({
			allowedPaths: ["tasks/"],
			blockingFailures: [],
			conformance: [],
			emitsEvents: [],
			emitsEvidence: false,
			failureClasses: [],
			idempotency: "required",
			inputSchema: "ha2haV3TaskClaimRequestSchema",
			name: "task.claim",
			outputSchema: "ha2haV3OperationRecordSchema",
			profile: "ha2ha-coordination",
			purpose: "Claim a task.",
			requiresActor: false,
			requiresAuthority: [],
			requiresBaseVersion: false,
			retry: "none",
			stateTransitions: [],
		}).success,
		false
	);
});

test("v3 task claim requests preserve v1 baseVersion conflict behavior", () => {
	assert.equal(
		ha2haV3TaskClaimRequestSchema.safeParse({
			actor: "agent-context-a",
			baseVersion: 4,
			claim: {
				claimed_at: "2026-07-09T10:00:00Z",
				participant: "agent-context-a",
			},
			path: "tasks/ENG-001.md",
		}).success,
		true
	);
	assert.equal(
		ha2haV3TaskClaimRequestSchema.safeParse({
			actor: "agent-context-a",
			claim: {
				claimed_at: "2026-07-09T10:00:00Z",
				participant: "agent-context-a",
			},
			path: "tasks/ENG-001.md",
		}).success,
		false
	);
});

test("v3 review anchors require stable workspace coordinates", () => {
	assert.equal(
		ha2haV3ReviewCommentRecordSchema.safeParse({
			author: "pax",
			created_at: "2026-07-09T10:00:00Z",
			id: "review-1",
			severity: "blocking",
			state: "open",
			target: {
				path: "tasks/ENG-001.md",
				selector: {
					type: "heading",
					value: "Acceptance",
				},
				version: 1,
				workspaceId: "workspace-1",
			},
		}).success,
		true
	);
	assert.equal(
		ha2haV3ReviewCommentRecordSchema.safeParse({
			author: "pax",
			created_at: "2026-07-09T10:00:00Z",
			id: "review-1",
			severity: "blocking",
			state: "open",
			target: {
				path: "tasks/ENG-001.md",
				version: 1,
			},
		}).success,
		false
	);
});

test("v3 validation output includes profile impact and repair hints", () => {
	assert.equal(
		ha2haV3ValidationOutputSchema.safeParse({
			issues: [
				{
					expected: "Evidence before done.",
					message: "Missing evidence.",
					observed: "No evidence.",
					path: "tasks/ENG-001.md",
					profile: "ha2ha-coordination",
					repairHint: "Add evidence or move the task out of done.",
					ruleId: HA2HA_VALIDATION_RULES.v3CompletionBlocked,
					severity: "error",
				},
			],
			ok: false,
			profiles: ["ha2ha-coordination"],
			workspaceId: "workspace-1",
		}).success,
		true
	);
});
