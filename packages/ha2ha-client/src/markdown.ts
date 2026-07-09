import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { err, isRecord, ok } from "./shared";
import type { Ha2haResult } from "./types";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u;

export const parseMarkdownFrontmatter = (
	content: string
): Ha2haResult<{ body: string; frontmatter: Record<string, unknown> }> => {
	const match = FRONTMATTER_PATTERN.exec(content);
	if (!match?.[1]) {
		return err("validation_error", "Expected YAML frontmatter.");
	}
	const parsed = parseYaml(match[1]);
	if (!isRecord(parsed)) {
		return err("validation_error", "Expected object YAML frontmatter.");
	}
	return ok({
		body: content.slice(match[0].length),
		frontmatter: parsed,
	});
};

export const formatMarkdownFrontmatter = (
	frontmatter: Record<string, unknown>,
	body: string
) => `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n\n${body.trim()}\n`;
