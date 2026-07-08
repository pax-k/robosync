const FILE_PATH_MAX_LENGTH = 512;
const TOKEN_BYTE_LENGTH = 24;
const WORKSPACE_ID_BYTE_LENGTH = 9;
const OBJECT_ID_BYTE_LENGTH = 18;

export type ReadAccess = "public" | "token";
export type WriteAccess = "none" | "public" | "token";

export interface UploadedObject {
	contentType: string;
	objectKey: string;
	path: string;
	sha256: string;
	sizeBytes: number;
}

const textEncoder = new TextEncoder();
const LEADING_DOT_SLASHES_PATTERN = /^\.\/+/;
const TRAILING_SLASH_PATTERN = /\/$/;

export class WorkspaceError extends Error {
	readonly code: string;
	readonly status: 400 | 401 | 403 | 404 | 409 | 500;

	constructor(
		status: 400 | 401 | 403 | 404 | 409 | 500,
		code: string,
		message: string,
		cause?: unknown
	) {
		super(message, { cause });
		this.code = code;
		this.name = "WorkspaceError";
		this.status = status;
	}
}

export function assertValidAccess(
	readAccess: ReadAccess,
	writeAccess: WriteAccess
) {
	if (writeAccess === "public" && readAccess !== "public") {
		throw new WorkspaceError(
			400,
			"invalid_access",
			"Public write access requires public read access."
		);
	}
}

export function buildWorkspaceUrls({
	editToken,
	id,
	origin,
	readAccess,
	readToken,
	webOrigin,
	writeAccess,
}: {
	editToken: string | null;
	id: string;
	origin: string;
	readAccess: ReadAccess;
	readToken: string | null;
	webOrigin?: string | null;
	writeAccess: WriteAccess;
}) {
	const apiOrigin = withoutTrailingSlash(origin);
	const workspaceOrigin = withoutTrailingSlash(webOrigin ?? origin);
	const workspacePath = `/w/${id}`;
	const rawPath = `/w/${id}/raw`;
	const readQuery =
		readAccess === "token" && readToken ? `?k=${readToken}` : "";
	const editQuery =
		writeAccess === "token" && editToken ? `?edit=${editToken}` : "";

	return {
		editUrl:
			writeAccess === "none"
				? undefined
				: `${workspaceOrigin}${workspacePath}${writeAccess === "token" ? editQuery : ""}`,
		rawUrl: `${apiOrigin}${rawPath}${readQuery}`,
		workspaceUrl: `${workspaceOrigin}${workspacePath}${readQuery}`,
	};
}

export function contentSizeBytes(content: string) {
	return textEncoder.encode(content).byteLength;
}

export function createObjectKey(workspaceId: string) {
	return `workspaces/${workspaceId}/objects/${randomUrlToken(OBJECT_ID_BYTE_LENGTH)}`;
}

export function createR2Prefix(workspaceId: string) {
	return `workspaces/${workspaceId}`;
}

export function createWorkspaceId() {
	return randomUrlToken(WORKSPACE_ID_BYTE_LENGTH);
}

export function extractBearerToken(value: string | null) {
	if (!value) {
		return null;
	}
	const [scheme, token] = value.split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return null;
	}
	return token;
}

export function formatRawListing({
	files,
	id,
	title,
	updatedAt,
}: {
	files: string[];
	id: string;
	title: string | null;
	updatedAt: string;
}) {
	const header = [
		`# robosync workspace: ${id}`,
		`title: ${title ?? id}`,
		`updated_at: ${updatedAt}`,
		"",
	];
	return `${[...header, ...files].join("\n")}\n`;
}

export function normalizeFilePath(input: string) {
	if (typeof input !== "string") {
		throw new WorkspaceError(
			400,
			"invalid_path",
			"File path must be a string."
		);
	}

	const normalized = input
		.replaceAll("\\", "/")
		.replace(LEADING_DOT_SLASHES_PATTERN, "");

	if (!normalized || normalized.length > FILE_PATH_MAX_LENGTH) {
		throw new WorkspaceError(
			400,
			"invalid_path",
			"File path is empty or too long."
		);
	}
	if (normalized.startsWith("/") || normalized.endsWith("/")) {
		throw new WorkspaceError(
			400,
			"invalid_path",
			"File path must be relative and file-like."
		);
	}
	if (normalized.includes("//")) {
		throw new WorkspaceError(
			400,
			"invalid_path",
			"File path cannot contain empty segments."
		);
	}

	const segments = normalized.split("/");
	if (
		segments.some((segment) => !segment || segment === "." || segment === "..")
	) {
		throw new WorkspaceError(
			400,
			"invalid_path",
			"File path cannot contain dot segments."
		);
	}

	return normalized;
}

export function randomCapabilityToken() {
	return randomUrlToken(TOKEN_BYTE_LENGTH);
}

export async function sha256Hex(input: string) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		textEncoder.encode(input)
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export function tokenHash(token: string) {
	return sha256Hex(token);
}

export function validateUniquePaths(paths: string[]) {
	const seen = new Set<string>();
	for (const path of paths) {
		if (seen.has(path)) {
			throw new WorkspaceError(
				400,
				"duplicate_path",
				`Duplicate file path: ${path}`
			);
		}
		seen.add(path);
	}
}

function randomUrlToken(byteLength: number) {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function withoutTrailingSlash(value: string) {
	return value.replace(TRAILING_SLASH_PATTERN, "");
}
