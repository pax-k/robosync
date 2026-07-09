import { err, ok } from "./errors";
import type { MdsyncAuth, MdsyncLinkInput, MdsyncResult } from "./types";

export const buildProductLink = ({
	auth,
	input,
	mode,
	origin,
	workspaceId,
}: {
	auth: MdsyncAuth;
	input: MdsyncLinkInput;
	mode: "edit" | "raw" | "workspace";
	origin: string;
	workspaceId?: string;
}): MdsyncResult<string> => {
	const resolvedWorkspaceId = resolveWorkspaceId(
		input.workspaceId ?? workspaceId
	);
	if (!resolvedWorkspaceId.ok) {
		return resolvedWorkspaceId;
	}
	const encodedWorkspaceId = encodeURIComponent(resolvedWorkspaceId.data);
	const encodedPath = input.path
		? `/${input.path.split("/").map(encodeURIComponent).join("/")}`
		: "";
	const pathname =
		mode === "raw"
			? `/w/${encodedWorkspaceId}/raw${encodedPath}`
			: `/w/${encodedWorkspaceId}`;
	const url = new URL(pathname, `${origin}/`);
	if (mode === "edit" && auth.kind === "edit-token") {
		url.searchParams.set("edit", auth.token);
	}
	if (mode !== "edit" && auth.kind === "read-token") {
		url.searchParams.set("k", auth.token);
	}
	if (mode === "workspace" && auth.kind === "edit-token") {
		url.searchParams.set("edit", auth.token);
	}
	return ok(url.toString());
};

export const resolveWorkspaceId = (workspaceId?: string): MdsyncResult<string> =>
	workspaceId && workspaceId.length > 0
		? ok(workspaceId)
		: err("validation_error", "A workspaceId is required for this operation.");

export const contentTypeForPath = (path: string) =>
	path.endsWith(".md") ? DEFAULT_CONTENT_TYPE : "application/octet-stream";

export const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";
