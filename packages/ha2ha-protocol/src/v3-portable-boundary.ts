import {
	listFiles,
	readFrontmatter,
	readJsonFile,
	toWorkspaceRelativePath,
} from "./validator-readers";
import {
	createIssue,
	HA2HA_VALIDATION_RULES,
	type Ha2haValidationIssue,
} from "./validator-types";

const FORBIDDEN_SECRET_KEY_PATTERN =
	/(?:^|[_-])(raw[_-]?token|token|secret|private[_-]?key|credential)(?:$|[_-])/iu;
const FORBIDDEN_SECRET_VALUE_PATTERN =
	/(?:sk-[A-Za-z0-9]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/u;
const PROVIDER_PAYLOAD_KEY_PATTERN =
	/(provider[_-]?payload|raw[_-]?provider|raw[_-]?trace|private[_-]?reasoning|chain[_-]?of[_-]?thought)/iu;
const PORTABLE_BOUNDARY_FILE_PATTERN = /\.(json|md|yaml|yml)$/u;

export const validatePortableBoundary = async (
	absoluteRoot: string,
	issues: Ha2haValidationIssue[]
) => {
	const files = await listFiles(absoluteRoot);
	const checkedFiles = await Promise.all(
		files
			.filter((filePath) => PORTABLE_BOUNDARY_FILE_PATTERN.test(filePath))
			.map(async (filePath) => {
				const relativePath = toWorkspaceRelativePath(absoluteRoot, filePath);
				const json = filePath.endsWith(".json")
					? await readJsonFile(filePath, relativePath, [])
					: null;
				if (json?.ok) {
					return { relativePath, value: json.value };
				}
				const frontmatter = filePath.endsWith(".md")
					? await readFrontmatter(filePath, relativePath, [])
					: null;
				if (frontmatter?.ok) {
					return { relativePath, value: frontmatter.value };
				}
				return null;
			})
	);
	for (const checkedFile of checkedFiles) {
		if (!checkedFile) {
			continue;
		}
		scanPortableBoundaryValue(
			checkedFile.value,
			checkedFile.relativePath,
			issues
		);
	}
};

const scanPortableBoundaryValue = (
	value: unknown,
	sourcePath: string,
	issues: Ha2haValidationIssue[],
	pointer = ""
) => {
	if (Array.isArray(value)) {
		for (const [index, child] of value.entries()) {
			scanPortableBoundaryValue(
				child,
				sourcePath,
				issues,
				`${pointer}/${index}`
			);
		}
		return;
	}
	if (value && typeof value === "object") {
		scanObjectBoundaryValue(value, sourcePath, issues, pointer);
		return;
	}
	if (typeof value === "string" && FORBIDDEN_SECRET_VALUE_PATTERN.test(value)) {
		issues.push(
			createIssue({
				message: "Portable HA2HA records must not store raw credential values.",
				path: `${sourcePath}#${pointer}`,
				repairHint:
					"Replace credential material with a product-owned secret reference.",
				ruleId: HA2HA_VALIDATION_RULES.v3SecretLeak,
				severity: "error",
			})
		);
	}
};

const scanObjectBoundaryValue = (
	value: object,
	sourcePath: string,
	issues: Ha2haValidationIssue[],
	pointer: string
) => {
	for (const [key, child] of Object.entries(value)) {
		const issuePath = `${sourcePath}#${pointer}/${key}`;
		if (FORBIDDEN_SECRET_KEY_PATTERN.test(key)) {
			issues.push(
				createIssue({
					message:
						"Portable HA2HA records must not store secrets or raw tokens.",
					path: issuePath,
					repairHint:
						"Store secret references in product-owned secure storage, not workspace records.",
					ruleId: HA2HA_VALIDATION_RULES.v3SecretLeak,
					severity: "error",
				})
			);
		}
		if (PROVIDER_PAYLOAD_KEY_PATTERN.test(key)) {
			issues.push(
				createIssue({
					message:
						"Portable HA2HA records must not embed provider payloads or private reasoning.",
					path: issuePath,
					repairHint:
						"Store stable references, summaries, actors, timestamps, evidence, and target coordinates only.",
					ruleId: HA2HA_VALIDATION_RULES.v3ProviderPayloadLeak,
					severity: "error",
				})
			);
		}
		scanPortableBoundaryValue(child, sourcePath, issues, `${pointer}/${key}`);
	}
};
