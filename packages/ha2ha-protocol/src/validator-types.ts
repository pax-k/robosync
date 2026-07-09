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
