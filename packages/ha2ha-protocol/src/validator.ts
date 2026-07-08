import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { z } from "zod";

import { HA2HA_CAPABILITIES, HA2HA_PATHS } from "./constants";
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

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/u;
const JSON_INDENT_SPACES = 2;

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

type SchemaIssueClassifier = (issue: z.core.$ZodIssue) => {
	repairHint?: string;
	ruleId: Ha2haValidationRuleId;
};
type FailedSchemaResult = Extract<
	z.ZodSafeParseResult<unknown>,
	{ success: false }
>;

const createIssue = ({
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

const readJsonFile = async (
	filePath: string,
	relativePath: string,
	issues: Ha2haValidationIssue[]
): Promise<{ ok: true; value: unknown } | { ok: false }> => {
	try {
		const raw = await readFile(filePath, "utf8");
		return { ok: true, value: JSON.parse(raw) };
	} catch (error) {
		issues.push(
			createIssue({
				message: error instanceof Error ? error.message : "Invalid JSON.",
				path: relativePath,
				repairHint: "Fix the JSON syntax.",
				ruleId: HA2HA_VALIDATION_RULES.invalidJson,
				severity: "error",
			})
		);
		return { ok: false };
	}
};

const readFrontmatter = async (
	filePath: string,
	relativePath: string,
	issues: Ha2haValidationIssue[]
): Promise<{ ok: true; value: unknown } | { ok: false }> => {
	const raw = await readFile(filePath, "utf8");
	const match = FRONTMATTER_PATTERN.exec(raw);
	if (!match?.[1]) {
		issues.push(
			createIssue({
				message: "Missing YAML frontmatter.",
				path: relativePath,
				repairHint: "Add YAML frontmatter between --- markers.",
				ruleId: HA2HA_VALIDATION_RULES.missingFrontmatter,
				severity: "error",
			})
		);
		return { ok: false };
	}
	try {
		return { ok: true, value: parseYaml(match[1]) };
	} catch (error) {
		issues.push(
			createIssue({
				message:
					error instanceof Error ? error.message : "Invalid YAML frontmatter.",
				path: relativePath,
				repairHint: "Fix the YAML frontmatter syntax.",
				ruleId: HA2HA_VALIDATION_RULES.invalidYamlFrontmatter,
				severity: "error",
			})
		);
		return { ok: false };
	}
};

const pushZodIssues = ({
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
		const classifiedIssue = classifyIssue?.(issue) ?? { repairHint, ruleId };
		issues.push(
			createIssue({
				message: issue.message,
				path: formatIssuePath(sourcePath, issue.path),
				repairHint: classifiedIssue.repairHint ?? repairHint,
				ruleId: classifiedIssue.ruleId,
				severity: "error",
			})
		);
	}
};

const classifyActorIssue: SchemaIssueClassifier = (issue) => {
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

const classifyEvidenceIssue: SchemaIssueClassifier = (issue) => {
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

const listFiles = async (rootDir: string): Promise<string[]> => {
	if (!(await pathExists(rootDir))) {
		return [];
	}
	const entries = await readdir(rootDir, { withFileTypes: true });
	const filesByEntry = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(rootDir, entry.name);
			if (entry.isDirectory()) {
				return listFiles(entryPath);
			}
			if (entry.isFile()) {
				return [entryPath];
			}
			return [];
		})
	);
	const files = filesByEntry.flat();
	return files.sort((left, right) => left.localeCompare(right));
};

const pathExists = async (filePath: string): Promise<boolean> => {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
};

const toWorkspaceRelativePath = (absoluteRoot: string, filePath: string) =>
	path.relative(absoluteRoot, filePath).split(path.sep).join("/");

export const formatValidationResult = (result: Ha2haValidationResult): string =>
	JSON.stringify(result, null, JSON_INDENT_SPACES);
