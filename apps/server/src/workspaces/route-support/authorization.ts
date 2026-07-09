import { extractBearerToken, tokenHash, WorkspaceError } from "../domain";
import type { WorkspaceRow } from "../storage";

export async function authorizeRead(workspace: WorkspaceRow, request: Request) {
	if (workspace.read_access === "public") {
		return;
	}

	const url = new URL(request.url);
	const readToken = url.searchParams.get("k");
	const editToken =
		url.searchParams.get("edit") ??
		extractBearerToken(request.headers.get("Authorization"));

	if (!(readToken || editToken)) {
		throw new WorkspaceError(401, "missing_token", "Read token is required.");
	}

	const readTokenMatches =
		readToken &&
		workspace.read_token_hash &&
		(await tokenHash(readToken)) === workspace.read_token_hash;
	const editTokenMatches =
		editToken &&
		workspace.write_token_hash &&
		(await tokenHash(editToken)) === workspace.write_token_hash;

	if (!(readTokenMatches || editTokenMatches)) {
		throw new WorkspaceError(403, "invalid_token", "Read token is invalid.");
	}
}

export async function authorizeWrite(
	workspace: WorkspaceRow,
	request: Request
) {
	if (workspace.write_access === "none") {
		throw new WorkspaceError(403, "write_disabled", "Workspace is read-only.");
	}
	if (workspace.write_access === "public") {
		return;
	}

	const url = new URL(request.url);
	const token =
		extractBearerToken(request.headers.get("Authorization")) ??
		url.searchParams.get("edit");

	if (!token) {
		throw new WorkspaceError(401, "missing_token", "Write token is required.");
	}
	if (
		!workspace.write_token_hash ||
		(await tokenHash(token)) !== workspace.write_token_hash
	) {
		throw new WorkspaceError(403, "invalid_token", "Write token is invalid.");
	}
}
