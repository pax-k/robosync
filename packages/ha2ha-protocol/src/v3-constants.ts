export const HA2HA_V3_VERSION = "3.0.0" as const;

export const HA2HA_V3_PROFILES = {
	coordination: "ha2ha-coordination",
	engineering: "ha2ha-engineering",
	evidenceReview: "ha2ha-evidence-review",
	governance: "ha2ha-governance",
	methods: "ha2ha-methods",
	provisioning: "ha2ha-provisioning",
	transportHttp: "ha2ha-transport-http",
	trust: "ha2ha-trust",
	validation: "ha2ha-validation",
} as const;

export const HA2HA_V3_REQUIRED_FIRST_SLICE_METHODS = [
	"workspace.validate",
	"task.claim",
	"task.handoff",
	"evidence.add",
	"review.comment",
] as const;

export const HA2HA_V3_METHODS = {
	approvalRecord: "approval.record",
	checkRecord: "check.record",
	decisionRecord: "decision.record",
	engineeringLinkBranch: "engineering.link-branch",
	engineeringLinkCommit: "engineering.link-commit",
	engineeringLinkIssue: "engineering.link-issue",
	engineeringLinkPullRequest: "engineering.link-pull-request",
	engineeringLinkRepository: "engineering.link-repository",
	engineeringRecordCheck: "engineering.record-check",
	engineeringRecordDeployment: "engineering.record-deployment",
	evidenceAdd: "evidence.add",
	fileDelete: "file.delete",
	fileRead: "file.read",
	fileUpdate: "file.update",
	questionAnswer: "question.answer",
	questionAsk: "question.ask",
	reviewComment: "review.comment",
	reviewResolve: "review.resolve",
	taskBlock: "task.block",
	taskClaim: "task.claim",
	taskComplete: "task.complete",
	taskHandoff: "task.handoff",
	taskMarkReady: "task.mark-ready",
	taskRelease: "task.release",
	taskRequestReview: "task.request-review",
	workspaceCreate: "workspace.create",
	workspaceExport: "workspace.export",
	workspaceImport: "workspace.import",
	workspaceRestore: "workspace.restore",
	workspaceSnapshot: "workspace.snapshot",
	workspaceValidate: "workspace.validate",
} as const;

export const HA2HA_V3_FAILURE_CLASSES = [
	"validation_failed",
	"version_conflict",
	"authority_denied",
	"state_conflict",
	"missing_evidence",
	"unresolved_review",
	"external_unavailable",
	"unsupported_profile",
	"human_input_required",
] as const;

export const HA2HA_V3_DIRECTORIES = {
	approvals: "approvals",
	handoffs: "handoffs",
	questions: "questions",
	reviews: "reviews",
	v3Metadata: ".ha2ha/v3",
} as const;

export const HA2HA_V3_PATHS = {
	approvals: `${HA2HA_V3_DIRECTORIES.approvals}/`,
	auditEvents: `${HA2HA_V3_DIRECTORIES.v3Metadata}/audit-events.json`,
	auditExport: `${HA2HA_V3_DIRECTORIES.v3Metadata}/audit-export.json`,
	authorityGrants: `${HA2HA_V3_DIRECTORIES.v3Metadata}/authority-grants.json`,
	engineering: `${HA2HA_V3_DIRECTORIES.v3Metadata}/engineering.json`,
	handoffs: `${HA2HA_V3_DIRECTORIES.handoffs}/`,
	methods: `${HA2HA_V3_DIRECTORIES.v3Metadata}/methods.json`,
	policyGates: `${HA2HA_V3_DIRECTORIES.v3Metadata}/policy-gates.json`,
	questions: `${HA2HA_V3_DIRECTORIES.questions}/`,
	reviews: `${HA2HA_V3_DIRECTORIES.reviews}/`,
	riskExceptions: `${HA2HA_V3_DIRECTORIES.v3Metadata}/risk-exceptions.json`,
} as const;

export const HA2HA_V3_PRINCIPAL_KINDS = [
	"human",
	"agent-runtime",
	"service-account",
	"team",
	"organization",
] as const;

export const HA2HA_V3_PARTICIPANT_KINDS = [
	"human",
	"agent",
	"human-agent-pair",
	"service-account",
	"automation",
] as const;

export const HA2HA_V3_ROLES = [
	"owner",
	"maintainer",
	"reviewer",
	"contributor",
	"observer",
	"automation",
] as const;

export const HA2HA_V3_AUTHORITY_GRANTS = [
	"read",
	"write",
	"claim",
	"approve",
	"publish",
	"deploy",
	"administer",
] as const;

export const HA2HA_V3_REVIEW_STATES = ["open", "resolved"] as const;

export const HA2HA_V3_REVIEW_SEVERITIES = [
	"blocking",
	"non-blocking",
	"question",
] as const;

export const HA2HA_V3_APPROVAL_DECISIONS = [
	"approved",
	"rejected",
	"changes-requested",
] as const;

export const HA2HA_V3_EVIDENCE_QUALITY_STATES = [
	"accepted",
	"rejected",
	"stale",
	"insufficient",
	"risk-accepted",
] as const;

export const HA2HA_V3_PROVIDER_REFERENCE_TYPES = [
	"repository",
	"branch",
	"commit",
	"issue",
	"pull-request",
	"check",
	"deployment",
	"code-review",
] as const;

export const HA2HA_V3_OPERATION_RECORD_MODE = "operation-record" as const;

export const HA2HA_V3_EXAMPLE_FIXTURES = [
	"valid/v3-coordination-only",
	"valid/v3-trust-only",
	"valid/v3-evidence-review-only",
	"valid/v3-engineering-only",
	"valid/v3-governance-only",
	"valid/v3-methods-only",
	"valid/v3-engineering-team-workspace",
	"invalid/v3-missing-required-method",
	"invalid/v3-blocked-completion",
	"invalid/v3-provider-payload-leak",
	"invalid/v3-secret-leak",
] as const;

export const HA2HA_V3_CONFORMANCE_CHECKS = [
	"v3-profile-claims-independent",
	"v3-required-method-contracts",
	"v3-base-version-preserved",
	"v3-review-target-coordinates",
	"v3-completion-gates",
	"v3-secret-redaction",
	"v3-provider-payload-boundary",
] as const;

export type Ha2haV3Profile =
	(typeof HA2HA_V3_PROFILES)[keyof typeof HA2HA_V3_PROFILES];
export type Ha2haV3Method =
	(typeof HA2HA_V3_METHODS)[keyof typeof HA2HA_V3_METHODS];
export type Ha2haV3FailureClass = (typeof HA2HA_V3_FAILURE_CLASSES)[number];
export type Ha2haV3PrincipalKind = (typeof HA2HA_V3_PRINCIPAL_KINDS)[number];
export type Ha2haV3ParticipantKind =
	(typeof HA2HA_V3_PARTICIPANT_KINDS)[number];
export type Ha2haV3Role = (typeof HA2HA_V3_ROLES)[number];
export type Ha2haV3AuthorityGrant = (typeof HA2HA_V3_AUTHORITY_GRANTS)[number];
export type Ha2haV3ReviewState = (typeof HA2HA_V3_REVIEW_STATES)[number];
export type Ha2haV3ReviewSeverity = (typeof HA2HA_V3_REVIEW_SEVERITIES)[number];
export type Ha2haV3ApprovalDecision =
	(typeof HA2HA_V3_APPROVAL_DECISIONS)[number];
export type Ha2haV3EvidenceQualityState =
	(typeof HA2HA_V3_EVIDENCE_QUALITY_STATES)[number];
export type Ha2haV3ProviderReferenceType =
	(typeof HA2HA_V3_PROVIDER_REFERENCE_TYPES)[number];
export type Ha2haV3ExampleFixture = (typeof HA2HA_V3_EXAMPLE_FIXTURES)[number];
export type Ha2haV3ConformanceCheck =
	(typeof HA2HA_V3_CONFORMANCE_CHECKS)[number];
