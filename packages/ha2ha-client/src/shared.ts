import { createHash } from "node:crypto";
import { HA2HA_CONFLICT, ha2haWorkspacePathSchema } from "@ha2ha/protocol";
import type {
	Ha2haClientError,
	Ha2haClientErrorCode,
	Ha2haFile,
	Ha2haResult,
} from "./types";

const MARKDOWN_EXTENSION_PATTERN = /\.md$/u;

export const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";

export const contentTypeForPath = (filePath: string) =>
	MARKDOWN_EXTENSION_PATTERN.test(filePath)
		? DEFAULT_CONTENT_TYPE
		: "application/octet-stream";

export const ok = <Data>(data: Data): Ha2haResult<Data> => ({
	data,
	ok: true,
});

export const err = <Data>(
	code: Ha2haClientErrorCode,
	message: string,
	extra: Omit<Ha2haClientError, "code" | "message"> = {}
): Ha2haResult<Data> => ({
	error: { code, message, ...extra },
	ok: false,
});

export const errFromClientError = <Data>(
	error: Ha2haClientError
): Ha2haResult<Data> => ({
	error,
	ok: false,
});

export const conflictFromFile = (file: Ha2haFile): Ha2haResult<never> =>
	err("version_conflict", HA2HA_CONFLICT.message, {
		latest: {
			content: file.content,
			contentType: file.contentType,
			path: file.path,
			version: file.version,
			workspaceId: file.workspaceId,
		},
		status: 409,
	});

export const responseError = async <Data>(
	response: Response,
	action: string
): Promise<Ha2haResult<Data>> => {
	let message = response.statusText;
	try {
		const body = await response.json();
		if (isRecord(body)) {
			message =
				getOptionalString(body, "message") ??
				getOptionalString(body, "error") ??
				message;
		}
	} catch {
		// Keep the status text when the body is not JSON.
	}
	return err("transport_error", `Failed to ${action}: ${message}`, {
		status: response.status,
	});
};

export const validateWorkspacePath = (
	filePath: string
): Ha2haClientError | null => {
	const result = ha2haWorkspacePathSchema.safeParse(filePath);
	if (!result.success) {
		return {
			code: "validation_error",
			message: `Invalid HA2HA workspace path: ${filePath}`,
		};
	}
	return null;
};

export const sha256 = (content: string) =>
	createHash("sha256").update(content).digest("hex");

export const slug = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-|-$/gu, "")
		.slice(0, 80);

export const getRecord = (value: unknown): Record<string, unknown> =>
	isRecord(value) ? value : {};

export const getString = (
	value: unknown,
	key: string,
	fallback: string
): string => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "string" ? candidate : fallback;
};

export const getNullableString = (
	value: Record<string, unknown>,
	key: string
): string | null => {
	const candidate = value[key];
	return typeof candidate === "string" && candidate.length > 0
		? candidate
		: null;
};

export const getOptionalString = (value: unknown, key: string): string | null => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "string" ? candidate : null;
};

export const getNumber = (
	value: unknown,
	key: string,
	fallback: number
): number => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "number" ? candidate : fallback;
};

export const getOptionalNumber = (
	value: unknown,
	key: string
): number | undefined => {
	const candidate = getRecord(value)[key];
	return typeof candidate === "number" ? candidate : undefined;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
	error instanceof Error && "code" in error;
