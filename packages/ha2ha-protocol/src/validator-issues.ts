import {
	createIssue,
	type FailedSchemaResult,
	HA2HA_VALIDATION_RULES,
	type Ha2haValidationIssue,
	type Ha2haValidationRuleId,
	type SchemaIssueClassifier,
} from "./validator-types";

export const pushZodIssues = ({
	classifyIssue,
	issues,
	repairHint,
	result,
	ruleId,
	sourcePath,
}: {
	classifyIssue?: SchemaIssueClassifier;
	issues: Ha2haValidationIssue[];
	repairHint: string;
	result: FailedSchemaResult;
	ruleId: Ha2haValidationRuleId;
	sourcePath: string;
}) => {
	for (const issue of result.error.issues) {
		const classifiedIssue = classifyIssue?.(issue);
		issues.push(
			createIssue({
				message: issue.message,
				path: formatIssuePath(sourcePath, issue.path),
				repairHint: classifiedIssue?.repairHint ?? repairHint,
				ruleId: classifiedIssue?.ruleId ?? ruleId,
				severity: "error",
			})
		);
	}
};

export const classifyActorIssue: SchemaIssueClassifier = (issue) => {
	if (issue.path[0] === "actor") {
		return {
			repairHint: "Add a stable actor handle to the mutating request.",
			ruleId: HA2HA_VALIDATION_RULES.missingActor,
		};
	}
	return {
		repairHint: "Fix the mutating request shape.",
		ruleId: HA2HA_VALIDATION_RULES.invalidFileMutation,
	};
};

export const classifyEvidenceIssue: SchemaIssueClassifier = (issue) => {
	if (issue.path[0] === "target") {
		return {
			repairHint:
				"Targets must include workspaceId, normalized path, and positive version.",
			ruleId: HA2HA_VALIDATION_RULES.invalidTargetCoordinate,
		};
	}
	return {
		repairHint:
			"Evidence needs id, kind, result, actor, created_at, and task or target.",
		ruleId: HA2HA_VALIDATION_RULES.invalidEvidenceMetadata,
	};
};

const formatIssuePath = (
	sourcePath: string,
	issuePath: readonly (PropertyKey | PropertyKey[])[]
) => {
	if (issuePath.length === 0) {
		return sourcePath;
	}
	const encodedPath = issuePath.flat().map(String).join("/");
	return `${sourcePath}#/${encodedPath}`;
};
