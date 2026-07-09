import type { Ha2haValidationResult } from "./validator-types";

const JSON_INDENT_SPACES = 2;

export const formatValidationResult = (result: Ha2haValidationResult): string =>
	JSON.stringify(result, null, JSON_INDENT_SPACES);
