import type {
	MdsyncClientError,
	MdsyncClientErrorCode,
	MdsyncResult,
} from "./types";

export const ok = <Data>(data: Data): MdsyncResult<Data> => ({
	data,
	ok: true,
});

export const err = <Data>(
	code: MdsyncClientErrorCode,
	message: string,
	extra: Omit<MdsyncClientError, "code" | "message"> = {}
): MdsyncResult<Data> => ({
	error: { code, message, ...extra },
	ok: false,
});

export const toErrorCode = (value: string): MdsyncClientErrorCode => {
	const known = new Set<MdsyncClientErrorCode>([
		"comment_anchor_not_found",
		"comment_not_found",
		"file_not_found",
		"invalid_request",
		"invalid_retention_cutoff",
		"invalid_token",
		"missing_token",
		"not_found",
		"transport_error",
		"unsupported_operation",
		"validation_error",
		"version_conflict",
		"workspace_not_found",
		"write_disabled",
	]);
	return known.has(value as MdsyncClientErrorCode)
		? (value as MdsyncClientErrorCode)
		: "transport_error";
};

export const getRecord = (value: unknown): Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

export const getString = (
	value: unknown,
	key: string,
	fallback: string
): string => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "string" ? candidate : fallback;
};

export const messageFromCaught = (error: unknown): string =>
	error instanceof Error ? error.message : "MDSync request failed.";
