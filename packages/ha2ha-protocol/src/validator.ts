import path from "node:path";
import type { z } from "zod";

import { HA2HA_CAPABILITIES, HA2HA_PATHS } from "./constants";
import {
	classifyActorIssue,
	classifyEvidenceIssue,
	pushZodIssues,
} from "./validator-issues";
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
	type SchemaIssueClassifier,
} from "./validator-types";

// biome-ignore lint/performance/noBarrelFile: Public validator entrypoint preserves existing exports.
export { formatValidationResult } from "./validator-format";
export {
	HA2HA_VALIDATION_RULES,
	type Ha2haValidationIssue,
	type Ha2haValidationResult,
	type Ha2haValidationRuleId,
	type Ha2haValidationSeverity,
} from "./validator-types";

import {
	ha2haConflictResponseSchema,
	ha2haEvidenceMetadataSchema,
	ha2haFileDeleteRequestSchema,
	ha2haFileUpdateRequestSchema,
	ha2haParticipantFrontmatterSchema,
	ha2haTaskClaimUpdateSchema,
	ha2haTaskFrontmatterSchema,
	ha2haWorkspaceEventSchema,
	ha2haWorkspaceFileVersionSchema,
	ha2haWorkspaceManifestSchema,
} from "./schemas";

export const validateHa2haWorkspace = async (
	rootDir: string
): Promise<Ha2haValidationResult> => {
	const absoluteRoot = path.resolve(rootDir);
	const issues: Ha2haValidationIssue[] = [];
	const manifest = await validateManifest(absoluteRoot, issues);

	await validateMarkdownFrontmatterFiles({
		absoluteRoot,
		directory: HA2HA_PATHS.tasks,
		issues,
		repairHint: "Use one of the v1 task states and include id and title.",
		ruleId: HA2HA_VALIDATION_RULES.invalidTaskFrontmatter,
		schema: ha2haTaskFrontmatterSchema,
	});
	await validateMarkdownFrontmatterFiles({
		absoluteRoot,
		directory: HA2HA_PATHS.participants,
		issues,
		repairHint: "Participant files need at least a stable id.",
		ruleId: HA2HA_VALIDATION_RULES.invalidParticipantFrontmatter,
		schema: ha2haParticipantFrontmatterSchema,
	});
	await validateMarkdownFrontmatterFiles({
		absoluteRoot,
		classifyIssue: classifyEvidenceIssue,
		directory: HA2HA_PATHS.evidence,
		issues,
		repairHint:
			"Evidence needs id, kind, result, actor, created_at, and task or target.",
		ruleId: HA2HA_VALIDATION_RULES.invalidEvidenceMetadata,
		schema: ha2haEvidenceMetadataSchema,
	});
	await validateOperationFiles(absoluteRoot, issues);
	await validateProfileRecordFile({
		absoluteRoot,
		issues,
		relativePath: ".ha2ha/workspace-events.json",
		repairHint:
			"Event records need actor, workspaceId, path, version, type, and createdAt.",
		ruleId: HA2HA_VALIDATION_RULES.invalidEventRecord,
		schema: ha2haWorkspaceEventSchema,
	});
	await validateProfileRecordFile({
		absoluteRoot,
		issues,
		relativePath: ".ha2ha/file-versions.json",
		repairHint:
			"File-version records need workspaceId, path, version, contentType, sizeBytes, sha256, updatedBy, and createdAt.",
		ruleId: HA2HA_VALIDATION_RULES.invalidFileVersionRecord,
		schema: ha2haWorkspaceFileVersionSchema,
	});
	await validateSingleJsonFile({
		absoluteRoot,
		issues,
		relativePath: ".ha2ha/conflict-response.json",
		repairHint:
			"Conflict responses must include latest.workspaceId, latest.path, and latest.version.",
		ruleId: HA2HA_VALIDATION_RULES.invalidConflictResponse,
		schema: ha2haConflictResponseSchema,
	});

	if (
		manifest?.capabilities.includes(HA2HA_CAPABILITIES.importExportPreservation)
	) {
		await validatePreservationPaths(absoluteRoot, issues);
	}

	return {
		issues,
		ok: issues.every((issue) => issue.severity !== "error"),
		rootDir: absoluteRoot,
	};
};

const validateManifest = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
) => {
	const relativePath = HA2HA_PATHS.workspaceManifest;
	const filePath = path.join(absoluteRoot, relativePath);

	if (!(await pathExists(filePath))) {
		issues.push(
			createIssue({
				message: "Missing .ha2ha/workspace.json manifest.",
				path: relativePath,
				repairHint:
					"Add a workspace manifest with protocol, protocolVersion, workspaceId, paths, capabilities, routes, and conflictPolicy.",
				ruleId: HA2HA_VALIDATION_RULES.missingManifest,
				severity: "error",
			})
		);
		return null;
	}

	const json = await readJsonFile(filePath, relativePath, issues);
	if (!json.ok) {
		return null;
	}

	const result = ha2haWorkspaceManifestSchema.safeParse(json.value);
	if (!result.success) {
		pushZodIssues({
			issues,
			repairHint: "Align the manifest with the HA2HA v1 workspace shape.",
			result,
			ruleId: HA2HA_VALIDATION_RULES.invalidManifest,
			sourcePath: relativePath,
		});
		return null;
	}

	return result.data;
};

const validateMarkdownFrontmatterFiles = async <Schema extends z.ZodType>({
	absoluteRoot,
	classifyIssue,
	directory,
	issues,
	repairHint,
	ruleId,
	schema,
}: {
	absoluteRoot: string;
	classifyIssue?: SchemaIssueClassifier;
	directory: string;
	issues: Ha2haValidationIssue[];
	repairHint: string;
	ruleId: Ha2haValidationRuleId;
	schema: Schema;
}) => {
	const files = await listFiles(path.join(absoluteRoot, directory));
	await Promise.all(
		files
			.filter((filePath) => filePath.endsWith(".md"))
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
						classifyIssue,
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

const validateOperationFiles = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
) => {
	const files = await listFiles(path.join(absoluteRoot, "operations"));
	await Promise.all(
		files
			.filter((filePath) => filePath.endsWith(".json"))
			.map(async (filePath) => {
				const relativePath = toWorkspaceRelativePath(absoluteRoot, filePath);
				const json = await readJsonFile(filePath, relativePath, issues);
				if (!json.ok) {
					return;
				}

				if (relativePath.endsWith("claim-task.json")) {
					const result = ha2haTaskClaimUpdateSchema.safeParse(json.value);
					if (!result.success) {
						pushZodIssues({
							issues,
							repairHint:
								"Task claims must include actor, baseVersion, path, and next.state, next.owner, next.updated_by.",
							result,
							ruleId: HA2HA_VALIDATION_RULES.invalidClaimMetadata,
							sourcePath: relativePath,
						});
					}
					return;
				}

				if (relativePath.includes("delete")) {
					const result = ha2haFileDeleteRequestSchema.safeParse(json.value);
					if (!result.success) {
						pushZodIssues({
							classifyIssue: classifyActorIssue,
							issues,
							repairHint:
								"Deletes must include actor, baseVersion, and normalized path.",
							result,
							ruleId: HA2HA_VALIDATION_RULES.invalidFileMutation,
							sourcePath: relativePath,
						});
					}
					return;
				}

				const result = ha2haFileUpdateRequestSchema.safeParse(json.value);
				if (!result.success) {
					pushZodIssues({
						classifyIssue: classifyActorIssue,
						issues,
						repairHint:
							"Mutating file writes must include actor and normalized path; existing files also include baseVersion.",
						result,
						ruleId: HA2HA_VALIDATION_RULES.invalidFileMutation,
						sourcePath: relativePath,
					});
				}
			})
	);
};

const validateProfileRecordFile = async <Schema extends z.ZodType>({
	absoluteRoot,
	issues,
	relativePath,
	repairHint,
	ruleId,
	schema,
}: {
	absoluteRoot: string;
	issues: Ha2haValidationIssue[];
	relativePath: string;
	repairHint: string;
	ruleId: Ha2haValidationRuleId;
	schema: Schema;
}) => {
	const filePath = path.join(absoluteRoot, relativePath);
	if (!(await pathExists(filePath))) {
		return;
	}
	const json = await readJsonFile(filePath, relativePath, issues);
	if (!json.ok) {
		return;
	}
	if (!Array.isArray(json.value)) {
		issues.push(
			createIssue({
				message: "Expected a JSON array of profile records.",
				path: relativePath,
				repairHint,
				ruleId,
				severity: "error",
			})
		);
		return;
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
};

const validateSingleJsonFile = async <Schema extends z.ZodType>({
	absoluteRoot,
	issues,
	relativePath,
	repairHint,
	ruleId,
	schema,
}: {
	absoluteRoot: string;
	issues: Ha2haValidationIssue[];
	relativePath: string;
	repairHint: string;
	ruleId: Ha2haValidationRuleId;
	schema: Schema;
}) => {
	const filePath = path.join(absoluteRoot, relativePath);
	if (!(await pathExists(filePath))) {
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

const validatePreservationPaths = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
) => {
	const requiredPaths = [
		HA2HA_PATHS.decisions,
		HA2HA_PATHS.evidence,
		HA2HA_PATHS.logs,
		HA2HA_PATHS.manifestMarkdown,
		HA2HA_PATHS.participants,
		HA2HA_PATHS.status,
		HA2HA_PATHS.tasks,
		HA2HA_PATHS.workspaceManifest,
	] as const;
	const pathChecks = await Promise.all(
		requiredPaths.map(async (requiredPath) => ({
			exists: await pathExists(path.join(absoluteRoot, requiredPath)),
			requiredPath,
		}))
	);
	for (const { exists, requiredPath } of pathChecks) {
		if (exists) {
			continue;
		}
		issues.push(
			createIssue({
				message: `Claimed import/export preservation is missing ${requiredPath}.`,
				path: requiredPath,
				repairHint:
					"Preserve all v1 canonical paths when claiming import/export preservation.",
				ruleId: HA2HA_VALIDATION_RULES.preservationMissingPath,
				severity: "error",
			})
		);
	}
};
