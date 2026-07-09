import { WorkspaceError } from "../domain";
import { getFile, getWorkspace, getWorkspaceComment } from "../storage";

const INVALID_PERCENT_ESCAPE_PATTERN = /%(?![0-9A-Fa-f]{2})/;

export function rawFilePathFromRequest(workspaceId: string, request: Request) {
	const { pathname } = new URL(request.url);
	const prefix = `/w/${workspaceId}/raw/`;
	if (!pathname.startsWith(prefix)) {
		throw new WorkspaceError(400, "invalid_path", "Raw file path is invalid.");
	}

	const encodedPath = pathname.slice(prefix.length);
	if (INVALID_PERCENT_ESCAPE_PATTERN.test(encodedPath)) {
		throw new WorkspaceError(400, "invalid_path", "Raw file path is invalid.");
	}

	return decodeURIComponent(encodedPath);
}

export async function requireFile(workspaceId: string, path: string) {
	const file = await getFile(workspaceId, path);
	if (!file) {
		throw new WorkspaceError(404, "file_not_found", "File not found.");
	}
	return file;
}

export async function requireComment(workspaceId: string, commentId: string) {
	const comment = await getWorkspaceComment({ commentId, workspaceId });
	if (!comment) {
		throw new WorkspaceError(404, "comment_not_found", "Comment not found.");
	}
	return comment;
}

export async function requireWorkspace(workspaceId: string) {
	const workspace = await getWorkspace(workspaceId);
	if (!workspace) {
		throw new WorkspaceError(
			404,
			"workspace_not_found",
			"Workspace not found."
		);
	}
	return workspace;
}
