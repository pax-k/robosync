import type { z } from "zod";

export const HA2HA_VALIDATION_RULES = {
	invalidClaimMetadata: "HA2HA_INVALID_CLAIM_METADATA",
	invalidConflictResponse: "HA2HA_INVALID_CONFLICT_RESPONSE",
	invalidEventRecord: "HA2HA_INVALID_EVENT_RECORD",
	invalidEvidenceMetadata: "HA2HA_INVALID_EVIDENCE_METADATA",
	invalidFileMutation: "HA2HA_INVALID_FILE_MUTATION",
	invalidFileVersionRecord: "HA2HA_INVALID_FILE_VERSION_RECORD",
	invalidJson: "HA2HA_INVALID_JSON",
	invalidManifest: "HA2HA_INVALID_MANIFEST",
	invalidParticipantFrontmatter: "HA2HA_INVALID_PARTICIPANT_FRONTMATTER",
	invalidTargetCoordinate: "HA2HA_INVALID_TARGET_COORDINATE",
	invalidTaskFrontmatter: "HA2HA_INVALID_TASK_FRONTMATTER",
	invalidYamlFrontmatter: "HA2HA_INVALID_YAML_FRONTMATTER",
	missingActor: "HA2HA_MISSING_ACTOR",
	missingFrontmatter: "HA2HA_MISSING_FRONTMATTER",
	missingManifest: "HA2HA_MISSING_MANIFEST",
	preservationMissingPath: "HA2HA_PRESERVATION_MISSING_PATH",
	v3CompletionBlocked: "HA2HA_V3_COMPLETION_BLOCKED",
	v3InvalidApprovalRecord: "HA2HA_V3_INVALID_APPROVAL_RECORD",
	v3InvalidAuditEvent: "HA2HA_V3_INVALID_AUDIT_EVENT",
	v3InvalidAuditExport: "HA2HA_V3_INVALID_AUDIT_EXPORT",
	v3InvalidAuthorityGrant: "HA2HA_V3_INVALID_AUTHORITY_GRANT",
	v3InvalidEngineeringRecord: "HA2HA_V3_INVALID_ENGINEERING_RECORD",
	v3InvalidHandoffRecord: "HA2HA_V3_INVALID_HANDOFF_RECORD",
	v3InvalidMethodContract: "HA2HA_V3_INVALID_METHOD_CONTRACT",
	v3InvalidParticipantExtension: "HA2HA_V3_INVALID_PARTICIPANT_EXTENSION",
	v3InvalidPolicyGate: "HA2HA_V3_INVALID_POLICY_GATE",
	v3InvalidQuestionRecord: "HA2HA_V3_INVALID_QUESTION_RECORD",
	v3InvalidReviewRecord: "HA2HA_V3_INVALID_REVIEW_RECORD",
	v3InvalidRiskException: "HA2HA_V3_INVALID_RISK_EXCEPTION",
	v3InvalidTaskExtension: "HA2HA_V3_INVALID_TASK_EXTENSION",
	v3MissingProfileRecord: "HA2HA_V3_MISSING_PROFILE_RECORD",
	v3MissingRequiredMethod: "HA2HA_V3_MISSING_REQUIRED_METHOD",
	v3ProviderPayloadLeak: "HA2HA_V3_PROVIDER_PAYLOAD_LEAK",
	v3SecretLeak: "HA2HA_V3_SECRET_LEAK",
	v3UnsupportedProfile: "HA2HA_V3_UNSUPPORTED_PROFILE",
} as const;

export type Ha2haValidationRuleId =
	(typeof HA2HA_VALIDATION_RULES)[keyof typeof HA2HA_VALIDATION_RULES];

export type Ha2haValidationSeverity = "error" | "warning";

export interface Ha2haValidationIssue {
	message: string;
	path: string;
	repairHint?: string;
	ruleId: Ha2haValidationRuleId;
	severity: Ha2haValidationSeverity;
}

export interface Ha2haValidationResult {
	issues: Ha2haValidationIssue[];
	ok: boolean;
	rootDir: string;
}

export type SchemaIssueClassifier = (issue: z.core.$ZodIssue) => {
	repairHint?: string;
	ruleId: Ha2haValidationRuleId;
};
export type FailedSchemaResult = Extract<
	z.ZodSafeParseResult<unknown>,
	{ success: false }
>;

export const createIssue = ({
	message,
	path: issuePath,
	repairHint,
	ruleId,
	severity = "error",
}: Ha2haValidationIssue): Ha2haValidationIssue => ({
	message,
	path: issuePath,
	repairHint,
	ruleId,
	severity,
});
