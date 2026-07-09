import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
	createIssue,
	HA2HA_VALIDATION_RULES,
	type Ha2haValidationIssue,
} from "./validator-types";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/u;

export const readJsonFile = async (
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

export const readFrontmatter = async (
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

export const listFiles = async (rootDir: string): Promise<string[]> => {
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

export const pathExists = async (filePath: string): Promise<boolean> => {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
};

export const toWorkspaceRelativePath = (
	absoluteRoot: string,
	filePath: string
) => path.relative(absoluteRoot, filePath).split(path.sep).join("/");
