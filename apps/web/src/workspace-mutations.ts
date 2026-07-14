import { responseMessage } from "./api/workspaces";
import type {
	VersionConflictResponse,
	WorkspaceComment,
	WorkspaceFilePayload,
} from "./workspace-types";
import { PRODUCT_ACTOR } from "./workspace-utils";

interface WriteWorkspaceFileOptions {
	apiBaseUrl: string;
	content: string;
	contentType: string;
	editToken: string;
	path: string;
	version: number;
	workspaceId: string;
}

export type WriteWorkspaceFileResult =
	| {
			kind: "conflict";
			payload: VersionConflictResponse;
	  }
	| {
			kind: "saved";
			payload: Pick<
				WorkspaceFilePayload,
				"path" | "updatedAt" | "updatedBy" | "version"
			>;
	  };

export async function writeWorkspaceFile({
	apiBaseUrl,
	content,
	contentType,
	editToken,
	path,
	version,
	workspaceId,
}: WriteWorkspaceFileOptions): Promise<WriteWorkspaceFileResult> {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/files`,
		{
			body: JSON.stringify({
				actor: PRODUCT_ACTOR,
				baseVersion: version,
				content,
				contentType,
				path,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);

	if (response.status === 409) {
		return {
			kind: "conflict",
			payload: (await response.json()) as VersionConflictResponse,
		};
	}
	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}
	return {
		kind: "saved",
		payload: (await response.json()) as Pick<
			WorkspaceFilePayload,
			"path" | "updatedAt" | "updatedBy" | "version"
		>,
	};
}

export async function postWorkspaceComment({
	apiBaseUrl,
	body,
	editToken,
	path,
	selector,
	version,
	workspaceId,
}: {
	apiBaseUrl: string;
	body: string;
	editToken: string;
	path: string;
	selector?: { line: number };
	version: number;
	workspaceId: string;
}): Promise<WorkspaceComment> {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/comments`,
		{
			body: JSON.stringify({
				actor: PRODUCT_ACTOR,
				body,
				path,
				selector,
				version,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}
	return (await response.json()) as WorkspaceComment;
}

export async function postResolveWorkspaceComment({
	apiBaseUrl,
	commentId,
	editToken,
	workspaceId,
}: {
	apiBaseUrl: string;
	commentId: string;
	editToken: string;
	workspaceId: string;
}): Promise<WorkspaceComment> {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/comments/${encodeURIComponent(commentId)}/resolve`,
		{
			body: JSON.stringify({ actor: PRODUCT_ACTOR }),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}
	return (await response.json()) as WorkspaceComment;
}
