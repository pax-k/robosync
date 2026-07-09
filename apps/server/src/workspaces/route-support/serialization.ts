import {
	fetchObjectTextByKey,
	type WorkspaceCommentRow,
	type WorkspaceEventRow,
	type WorkspaceFileVersionRow,
	type WorkspaceRow,
} from "../storage";

const TRAILING_SLASH_PATTERN = /\/$/;

export function serializeWorkspace(workspace: WorkspaceRow) {
	return {
		createdAt: workspace.created_at,
		id: workspace.id,
		readAccess: workspace.read_access,
		title: workspace.title,
		updatedAt: workspace.updated_at,
		writeAccess: workspace.write_access,
	};
}

export function serializeWorkspaceCapabilities(workspace: WorkspaceRow) {
	return {
		edit: {
			access: workspace.write_access,
			canRevoke: workspace.write_access !== "none",
			canRotate: workspace.write_access !== "none",
			tokenActive: Boolean(workspace.write_token_hash),
		},
		read: {
			access: workspace.read_access,
			canRevoke:
				workspace.read_access === "token" && Boolean(workspace.read_token_hash),
			canRotate: true,
			tokenActive: Boolean(workspace.read_token_hash),
		},
	};
}

export function serializeWorkspaceEvent(event: WorkspaceEventRow) {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		id: event.id,
		path: event.path,
		payload: parseEventPayload(event.payload),
		type: event.type,
		version: event.version,
		workspaceId: event.workspace_id,
	};
}

export function serializeFileVersionMetadata(
	fileVersion: WorkspaceFileVersionRow
) {
	return {
		contentType: fileVersion.content_type,
		createdAt: fileVersion.created_at,
		path: fileVersion.path,
		sha256: fileVersion.sha256,
		sizeBytes: fileVersion.size_bytes,
		updatedBy: fileVersion.updated_by,
		version: fileVersion.version,
		workspaceId: fileVersion.workspace_id,
	};
}

export function serializeWorkspaceComment(comment: WorkspaceCommentRow) {
	return {
		anchor: parseEventPayload(comment.anchor_json),
		authorId: comment.author_id,
		body: comment.body,
		createdAt: comment.created_at,
		id: comment.id,
		path: comment.path,
		resolvedAt: comment.resolved_at,
		resolvedBy: comment.resolved_by,
		updatedAt: comment.updated_at,
		version: comment.version,
		workspaceId: comment.workspace_id,
	};
}

export async function serializeHistoricalFile(
	fileVersion: WorkspaceFileVersionRow
) {
	return {
		...serializeFileVersionMetadata(fileVersion),
		content: await fetchObjectTextByKey(fileVersion.object_key),
	};
}

export function buildReadCapabilityLinks({
	origin,
	readToken,
	webOrigin,
	workspaceId,
}: {
	origin: string;
	readToken: string;
	webOrigin?: string | null;
	workspaceId: string;
}) {
	const apiOrigin = withoutTrailingSlash(origin);
	const workspaceOrigin = withoutTrailingSlash(webOrigin ?? origin);
	const query = `?k=${encodeURIComponent(readToken)}`;
	return {
		rawUrl: `${apiOrigin}/w/${workspaceId}/raw${query}`,
		workspaceUrl: `${workspaceOrigin}/w/${workspaceId}${query}`,
	};
}

export function buildEditCapabilityLinks({
	editToken,
	webOrigin,
	workspaceId,
}: {
	editToken: string;
	webOrigin?: string | null;
	workspaceId: string;
}) {
	const workspaceOrigin = withoutTrailingSlash(webOrigin ?? "");
	return {
		editUrl: `${workspaceOrigin}/w/${workspaceId}?edit=${encodeURIComponent(editToken)}`,
	};
}

export function withoutTrailingSlash(value: string) {
	return value.replace(TRAILING_SLASH_PATTERN, "");
}

export function parseEventPayload(payload: string) {
	try {
		const parsed: unknown = JSON.parse(payload);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}
