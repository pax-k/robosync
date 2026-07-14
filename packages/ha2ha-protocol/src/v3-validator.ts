import path from "node:path";
import type { z } from "zod";

import { HA2HA_PATHS } from "./constants";
import {
	type Ha2haWorkspaceManifest,
	ha2haWorkspaceManifestSchema,
} from "./schemas";
import {
	HA2HA_V3_PATHS,
	HA2HA_V3_PROFILES,
	HA2HA_V3_REQUIRED_FIRST_SLICE_METHODS,
	type Ha2haV3Profile,
} from "./v3-constants";
import { validatePortableBoundary } from "./v3-portable-boundary";
import {
	type Ha2haV3TaskFrontmatter,
	ha2haV3ApprovalRecordSchema,
	ha2haV3AuditEventSchema,
	ha2haV3AuditExportSchema,
	ha2haV3AuthorityGrantSchema,
	ha2haV3EngineeringSchema,
	ha2haV3HandoffRecordSchema,
	ha2haV3MethodContractSchema,
	ha2haV3ParticipantFrontmatterSchema,
	ha2haV3PolicyGateSchema,
	ha2haV3QuestionRecordSchema,
	ha2haV3ReviewCommentRecordSchema,
	ha2haV3RiskExceptionSchema,
	ha2haV3TaskFrontmatterSchema,
} from "./v3-schemas";
import { validateHa2haWorkspace } from "./validator";
import { pushZodIssues } from "./validator-issues";
import {
	listFiles,
	pathExists,
	readFrontmatter,
	readJsonFile,
	toWorkspaceRelativePath,
} from "./validator-readers";
import {
	createIssue,
	HA2HA_VALIDATION_RULES,
	type Ha2haValidationIssue,
	type Ha2haValidationResult,
	type Ha2haValidationRuleId,
} from "./validator-types";

export interface Ha2haV3ValidationResult extends Ha2haValidationResult {
	profiles: Ha2haV3Profile[];
}

export const validateHa2haV3Workspace = async (
	rootDir: string
): Promise<Ha2haV3ValidationResult> => {
	const absoluteRoot = path.resolve(rootDir);
	const baseResult = await validateHa2haWorkspace(absoluteRoot);
	const issues = [...baseResult.issues];
	const manifest = await readWorkspaceManifest(absoluteRoot, issues);
	const profiles = manifest?.profiles ?? [];

	if (manifest && profiles.length > 0) {
		await validateClaimedProfiles({ absoluteRoot, issues, manifest, profiles });
	}

	return {
		issues,
		ok: issues.every((issue) => issue.severity !== "error"),
		profiles,
		rootDir: absoluteRoot,
	};
};

const readWorkspaceManifest = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
): Promise<
	(Ha2haWorkspaceManifest & { profiles?: Ha2haV3Profile[] }) | null
> => {
	const relativePath = HA2HA_PATHS.workspaceManifest;
	const filePath = path.join(absoluteRoot, relativePath);
	if (!(await pathExists(filePath))) {
		return null;
	}
	const json = await readJsonFile(filePath, relativePath, issues);
	if (!json.ok) {
		return null;
	}
	const result = ha2haWorkspaceManifestSchema.safeParse(json.value);
	if (!result.success) {
		return null;
	}
	return result.data;
};

const validateClaimedProfiles = async ({
	absoluteRoot,
	issues,
	manifest,
	profiles,
}: {
	absoluteRoot: string;
	issues: Ha2haValidationIssue[];
	manifest: Ha2haWorkspaceManifest & { profiles?: Ha2haV3Profile[] };
	profiles: Ha2haV3Profile[];
}) => {
	const profileSet = new Set(profiles);
	for (const profile of profiles) {
		if (!Object.values(HA2HA_V3_PROFILES).includes(profile)) {
			issues.push(
				createIssue({
					message: `Unsupported v3 profile claim: ${profile}.`,
					path: HA2HA_PATHS.workspaceManifest,
					repairHint: "Use one of the published HA2HA v3 profile ids.",
					ruleId: HA2HA_VALIDATION_RULES.v3UnsupportedProfile,
					severity: "error",
				})
			);
		}
	}

	await validateV3TaskFrontmatter(absoluteRoot, issues, profileSet);
	await validateV3ParticipantFrontmatter(absoluteRoot, issues, profileSet);
	await validateV3MethodContracts(absoluteRoot, issues, profileSet);
	await validateV3ProfileRecordFiles(absoluteRoot, issues, profileSet);
	await validateCompletionGates({ absoluteRoot, issues, manifest, profileSet });
	await validatePortableBoundary(absoluteRoot, issues);
};

const validateV3TaskFrontmatter = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[],
	profileSet: Set<Ha2haV3Profile>
) => {
	if (!profileSet.has(HA2HA_V3_PROFILES.coordination)) {
		return;
	}
	await validateMarkdownFrontmatterFiles({
		absoluteRoot,
		directory: HA2HA_PATHS.tasks,
		issues,
		repairHint:
			"Claimed coordination tasks need valid dependencies, claims, handoffs, acceptance, review, and approval fields.",
		ruleId: HA2HA_VALIDATION_RULES.v3InvalidTaskExtension,
		schema: ha2haV3TaskFrontmatterSchema,
	});
};

const validateV3ParticipantFrontmatter = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[],
	profileSet: Set<Ha2haV3Profile>
) => {
	if (!profileSet.has(HA2HA_V3_PROFILES.trust)) {
		return;
	}
	await validateMarkdownFrontmatterFiles({
		absoluteRoot,
		directory: HA2HA_PATHS.participants,
		issues,
		repairHint:
			"Claimed trust participants need valid kind, roles, authority, delegation, and scoped paths.",
		ruleId: HA2HA_VALIDATION_RULES.v3InvalidParticipantExtension,
		schema: ha2haV3ParticipantFrontmatterSchema,
	});
};

const validateV3MethodContracts = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[],
	profileSet: Set<Ha2haV3Profile>
) => {
	if (!profileSet.has(HA2HA_V3_PROFILES.methods)) {
		return;
	}
	const records = await validateArrayJsonFile({
		absoluteRoot,
		issues,
		relativePath: HA2HA_V3_PATHS.methods,
		repairHint:
			"Define v3 method contracts with inputs, outputs, write sets, authority, baseVersion, events, evidence, idempotency, retries, failures, and conformance.",
		required: true,
		ruleId: HA2HA_VALIDATION_RULES.v3InvalidMethodContract,
		schema: ha2haV3MethodContractSchema,
	});
	const methodNames = new Set(
		records
			.map((record) => ha2haV3MethodContractSchema.safeParse(record))
			.filter((result) => result.success)
			.map((result) => result.data.name)
	);
	for (const requiredMethod of HA2HA_V3_REQUIRED_FIRST_SLICE_METHODS) {
		if (methodNames.has(requiredMethod)) {
			continue;
		}
		issues.push(
			createIssue({
				message: `Missing required first-slice v3 method contract: ${requiredMethod}.`,
				path: HA2HA_V3_PATHS.methods,
				repairHint:
					"Add workspace.validate, task.claim, task.handoff, evidence.add, and review.comment method contracts.",
				ruleId: HA2HA_VALIDATION_RULES.v3MissingRequiredMethod,
				severity: "error",
			})
		);
	}
};

const validateV3ProfileRecordFiles = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[],
	profileSet: Set<Ha2haV3Profile>
) => {
	if (profileSet.has(HA2HA_V3_PROFILES.trust)) {
		await validateArrayJsonFile({
			absoluteRoot,
			issues,
			relativePath: HA2HA_V3_PATHS.authorityGrants,
			repairHint:
				"Authority grants need principal, grants, paths, grantedBy, and grantedAt.",
			required: true,
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidAuthorityGrant,
			schema: ha2haV3AuthorityGrantSchema,
		});
	}
	if (profileSet.has(HA2HA_V3_PROFILES.coordination)) {
		await validateMarkdownFrontmatterFiles({
			absoluteRoot,
			directory: HA2HA_V3_PATHS.handoffs,
			issues,
			repairHint:
				"Handoffs need task, from, summary, current state, next action, blockers, evidence, and timestamp.",
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidHandoffRecord,
			schema: ha2haV3HandoffRecordSchema,
		});
	}
	if (profileSet.has(HA2HA_V3_PROFILES.evidenceReview)) {
		await validateMarkdownFrontmatterFiles({
			absoluteRoot,
			directory: HA2HA_V3_PATHS.reviews,
			issues,
			repairHint:
				"Review records need stable target coordinates, author, state, severity, and timestamp.",
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidReviewRecord,
			schema: ha2haV3ReviewCommentRecordSchema,
		});
		await validateMarkdownFrontmatterFiles({
			absoluteRoot,
			directory: HA2HA_V3_PATHS.questions,
			issues,
			repairHint:
				"Question records need author, body, state, timestamp, and optional response.",
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidQuestionRecord,
			schema: ha2haV3QuestionRecordSchema,
		});
		await validateMarkdownFrontmatterFiles({
			absoluteRoot,
			directory: HA2HA_V3_PATHS.approvals,
			issues,
			repairHint:
				"Approval records need principal, authority basis, decision, target, and evidence.",
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidApprovalRecord,
			schema: ha2haV3ApprovalRecordSchema,
		});
	}
	if (profileSet.has(HA2HA_V3_PROFILES.governance)) {
		await validateArrayJsonFile({
			absoluteRoot,
			issues,
			relativePath: HA2HA_V3_PATHS.auditEvents,
			repairHint:
				"Audit events need actor, principal, authority basis, target, type, timestamp, and payload.",
			required: true,
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidAuditEvent,
			schema: ha2haV3AuditEventSchema,
		});
		await validateArrayJsonFile({
			absoluteRoot,
			issues,
			relativePath: HA2HA_V3_PATHS.policyGates,
			repairHint:
				"Policy gates need scope, blocked states, required checks, evidence kinds, and approval count.",
			required: true,
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidPolicyGate,
			schema: ha2haV3PolicyGateSchema,
		});
		await validateArrayJsonFile({
			absoluteRoot,
			issues,
			relativePath: HA2HA_V3_PATHS.riskExceptions,
			repairHint:
				"Risk exceptions need principal authority, reason, target, and timestamp.",
			required: false,
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidRiskException,
			schema: ha2haV3RiskExceptionSchema,
		});
		await validateSingleJsonFile({
			absoluteRoot,
			issues,
			relativePath: HA2HA_V3_PATHS.auditExport,
			repairHint:
				"Audit exports must preserve tasks, evidence, approvals, decisions, audit events, file versions, and profile records.",
			required: true,
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidAuditExport,
			schema: ha2haV3AuditExportSchema,
		});
	}
	if (profileSet.has(HA2HA_V3_PROFILES.engineering)) {
		await validateSingleJsonFile({
			absoluteRoot,
			issues,
			relativePath: HA2HA_V3_PATHS.engineering,
			repairHint:
				"Engineering profile records need portable repository, check, deployment, and provider reference fields only.",
			required: true,
			ruleId: HA2HA_VALIDATION_RULES.v3InvalidEngineeringRecord,
			schema: ha2haV3EngineeringSchema,
		});
	}
};

const validateCompletionGates = async ({
	absoluteRoot,
	issues,
	manifest,
	profileSet,
}: {
	absoluteRoot: string;
	issues: Ha2haValidationIssue[];
	manifest: Ha2haWorkspaceManifest & { profiles?: Ha2haV3Profile[] };
	profileSet: Set<Ha2haV3Profile>;
}) => {
	if (
		!(
			profileSet.has(HA2HA_V3_PROFILES.coordination) ||
			profileSet.has(HA2HA_V3_PROFILES.evidenceReview) ||
			profileSet.has(HA2HA_V3_PROFILES.governance) ||
			profileSet.has(HA2HA_V3_PROFILES.engineering)
		)
	) {
		return;
	}
	const tasks = await readTaskFrontmatter(absoluteRoot, issues);
	const blockingReviews = await readReviewRecords(absoluteRoot, issues);
	for (const task of tasks) {
		if (task.frontmatter.state !== "done") {
			continue;
		}
		validateDoneTaskCompletionGates({
			blockingReviews,
			issues,
			profileSet,
			task,
			workspaceId: manifest.workspaceId,
		});
	}
};

const validateDoneTaskCompletionGates = ({
	blockingReviews,
	issues,
	profileSet,
	task,
	workspaceId,
}: {
	blockingReviews: z.infer<typeof ha2haV3ReviewCommentRecordSchema>[];
	issues: Ha2haValidationIssue[];
	profileSet: Set<Ha2haV3Profile>;
	task: { frontmatter: Ha2haV3TaskFrontmatter; path: string };
	workspaceId: string;
}) => {
	validateCoordinationCompletionGate({ issues, profileSet, task });
	validateEvidenceReviewCompletionGates({
		blockingReviews,
		issues,
		profileSet,
		task,
		workspaceId,
	});
	validateEngineeringCompletionGate({ issues, profileSet, task });
};

const validateCoordinationCompletionGate = ({
	issues,
	profileSet,
	task,
}: {
	issues: Ha2haValidationIssue[];
	profileSet: Set<Ha2haV3Profile>;
	task: { frontmatter: Ha2haV3TaskFrontmatter; path: string };
}) => {
	if (
		profileSet.has(HA2HA_V3_PROFILES.coordination) &&
		(task.frontmatter.acceptance?.length ?? 0) === 0
	) {
		pushCompletionIssue({
			issues,
			message: "Done task is missing acceptance criteria.",
			path: task.path,
			profile: HA2HA_V3_PROFILES.coordination,
		});
	}
};

const validateEvidenceReviewCompletionGates = ({
	blockingReviews,
	issues,
	profileSet,
	task,
	workspaceId,
}: {
	blockingReviews: z.infer<typeof ha2haV3ReviewCommentRecordSchema>[];
	issues: Ha2haValidationIssue[];
	profileSet: Set<Ha2haV3Profile>;
	task: { frontmatter: Ha2haV3TaskFrontmatter; path: string };
	workspaceId: string;
}) => {
	if (!profileSet.has(HA2HA_V3_PROFILES.evidenceReview)) {
		return;
	}
	if ((task.frontmatter.evidence?.length ?? 0) === 0) {
		pushCompletionIssue({
			issues,
			message: "Done task is missing required evidence.",
			path: task.path,
			profile: HA2HA_V3_PROFILES.evidenceReview,
		});
	}
	if (
		task.frontmatter.review?.required === true &&
		(task.frontmatter.approvals?.length ?? 0) === 0
	) {
		pushCompletionIssue({
			issues,
			message: "Done task requires review approval but has no approvals.",
			path: task.path,
			profile: HA2HA_V3_PROFILES.evidenceReview,
		});
	}
	if (
		blockingReviews.some((review) =>
			isBlockingReviewForTask(review, workspaceId, task.path)
		)
	) {
		pushCompletionIssue({
			issues,
			message: "Done task has unresolved blocking review comments.",
			path: task.path,
			profile: HA2HA_V3_PROFILES.evidenceReview,
		});
	}
};

const validateEngineeringCompletionGate = ({
	issues,
	profileSet,
	task,
}: {
	issues: Ha2haValidationIssue[];
	profileSet: Set<Ha2haV3Profile>;
	task: { frontmatter: Ha2haV3TaskFrontmatter; path: string };
}) => {
	if (
		profileSet.has(HA2HA_V3_PROFILES.engineering) &&
		hasFailingChecks(task.frontmatter.checks)
	) {
		pushCompletionIssue({
			issues,
			message: "Done task has missing, stale, or failing required checks.",
			path: task.path,
			profile: HA2HA_V3_PROFILES.engineering,
		});
	}
};

const hasFailingChecks = (checks: unknown): boolean => {
	if (!Array.isArray(checks)) {
		return false;
	}
	return checks.some(
		(check) =>
			typeof check === "object" &&
			check !== null &&
			"result" in check &&
			check.result !== "pass"
	);
};

const readTaskFrontmatter = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
) => {
	const files = await listFiles(path.join(absoluteRoot, HA2HA_PATHS.tasks));
	const records = await Promise.all(
		files
			.filter((file) => file.endsWith(".md"))
			.map(async (filePath) => {
				const relativePath = toWorkspaceRelativePath(absoluteRoot, filePath);
				const frontmatter = await readFrontmatter(
					filePath,
					relativePath,
					issues
				);
				if (!frontmatter.ok) {
					return null;
				}
				const result = ha2haV3TaskFrontmatterSchema.safeParse(
					frontmatter.value
				);
				if (!result.success) {
					return null;
				}
				return { frontmatter: result.data, path: relativePath };
			})
	);
	return records.filter((record) => record !== null);
};

const readReviewRecords = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
) => {
	const files = await listFiles(
		path.join(absoluteRoot, HA2HA_V3_PATHS.reviews)
	);
	const records = await Promise.all(
		files
			.filter((file) => file.endsWith(".md"))
			.map(async (filePath) => {
				const relativePath = toWorkspaceRelativePath(absoluteRoot, filePath);
				const frontmatter = await readFrontmatter(
					filePath,
					relativePath,
					issues
				);
				if (!frontmatter.ok) {
					return null;
				}
				const result = ha2haV3ReviewCommentRecordSchema.safeParse(
					frontmatter.value
				);
				if (result.success) {
					return result.data;
				}
				return null;
			})
	);
	return records.filter((record) => record !== null);
};

const isBlockingReviewForTask = (
	review: z.infer<typeof ha2haV3ReviewCommentRecordSchema>,
	workspaceId: string,
	taskPath: string
) =>
	review.state === "open" &&
	review.severity === "blocking" &&
	review.target.workspaceId === workspaceId &&
	review.target.path === taskPath;

const pushCompletionIssue = ({
	issues,
	message,
	path: issuePath,
	profile,
}: {
	issues: Ha2haValidationIssue[];
	message: string;
	path: string;
	profile: Ha2haV3Profile;
}) => {
	issues.push(
		createIssue({
			message,
			path: issuePath,
			repairHint:
				"Resolve v3 completion gates before moving claimed-profile work to done.",
			ruleId: HA2HA_VALIDATION_RULES.v3CompletionBlocked,
			severity: "error",
		})
	);
	const latest = issues.at(-1);
	if (latest) {
		latest.message = `${latest.message} Profile blocked: ${profile}.`;
	}
};

const validateMarkdownFrontmatterFiles = async <Schema extends z.ZodType>({
	absoluteRoot,
	directory,
	issues,
	repairHint,
	ruleId,
	schema,
}: {
	absoluteRoot: string;
	directory: string;
	issues: Ha2haValidationIssue[];
	repairHint: string;
	ruleId: Ha2haValidationRuleId;
	schema: Schema;
}) => {
	const files = await listFiles(path.join(absoluteRoot, directory));
	await Promise.all(
		files
			.filter((file) => file.endsWith(".md"))
			.map(async (filePath) => {
				const relativePath = toWorkspaceRelativePath(absoluteRoot, filePath);
				const frontmatter = await readFrontmatter(
					filePath,
					relativePath,
					issues
				);
				if (!frontmatter.ok) {
					return;
				}
				const result = schema.safeParse(frontmatter.value);
				if (!result.success) {
					pushZodIssues({
						issues,
						repairHint,
						result,
						ruleId,
						sourcePath: relativePath,
					});
				}
			})
	);
};

const validateArrayJsonFile = async <Schema extends z.ZodType>({
	absoluteRoot,
	issues,
	relativePath,
	repairHint,
	required,
	ruleId,
	schema,
}: {
	absoluteRoot: string;
	issues: Ha2haValidationIssue[];
	relativePath: string;
	repairHint: string;
	required: boolean;
	ruleId: Ha2haValidationRuleId;
	schema: Schema;
}): Promise<unknown[]> => {
	const filePath = path.join(absoluteRoot, relativePath);
	if (!(await pathExists(filePath))) {
		if (required) {
			issues.push(
				createIssue({
					message: `Missing required v3 profile record file: ${relativePath}.`,
					path: relativePath,
					repairHint,
					ruleId: HA2HA_VALIDATION_RULES.v3MissingProfileRecord,
					severity: "error",
				})
			);
		}
		return [];
	}
	const json = await readJsonFile(filePath, relativePath, issues);
	if (!json.ok) {
		return [];
	}
	if (!Array.isArray(json.value)) {
		issues.push(
			createIssue({
				message: "Expected a JSON array of v3 profile records.",
				path: relativePath,
				repairHint,
				ruleId,
				severity: "error",
			})
		);
		return [];
	}
	for (const [index, record] of json.value.entries()) {
		const result = schema.safeParse(record);
		if (!result.success) {
			pushZodIssues({
				issues,
				repairHint,
				result,
				ruleId,
				sourcePath: `${relativePath}#/${index}`,
			});
		}
	}
	return json.value;
};

const validateSingleJsonFile = async <Schema extends z.ZodType>({
	absoluteRoot,
	issues,
	relativePath,
	repairHint,
	required,
	ruleId,
	schema,
}: {
	absoluteRoot: string;
	issues: Ha2haValidationIssue[];
	relativePath: string;
	repairHint: string;
	required: boolean;
	ruleId: Ha2haValidationRuleId;
	schema: Schema;
}) => {
	const filePath = path.join(absoluteRoot, relativePath);
	if (!(await pathExists(filePath))) {
		if (required) {
			issues.push(
				createIssue({
					message: `Missing required v3 profile record file: ${relativePath}.`,
					path: relativePath,
					repairHint,
					ruleId: HA2HA_VALIDATION_RULES.v3MissingProfileRecord,
					severity: "error",
				})
			);
		}
		return;
	}
	const json = await readJsonFile(filePath, relativePath, issues);
	if (!json.ok) {
		return;
	}
	const result = schema.safeParse(json.value);
	if (!result.success) {
		pushZodIssues({
			issues,
			repairHint,
			result,
			ruleId,
			sourcePath: relativePath,
		});
	}
};
