import { workspaceBindings } from "../bindings";
import type { WorkspaceFileRow } from "../storage";

export async function updateWorkspaceTotals({
	fileCountDelta,
	now,
	sizeDelta,
	workspaceId,
}: {
	fileCountDelta: number;
	now: string;
	sizeDelta: number;
	workspaceId: string;
}) {
	await workspaceBindings()
		.DB.prepare(
			`update workspaces
     set file_count = file_count + ?, total_size_bytes = total_size_bytes + ?, updated_at = ?
     where id = ?`
		)
		.bind(fileCountDelta, sizeDelta, now, workspaceId)
		.run();
}

export function createFileVersionStatement({
	contentType,
	createdAt,
	objectKey,
	path,
	sha256,
	sizeBytes,
	updatedBy,
	version,
	workspaceId,
}: {
	contentType: string;
	createdAt: string;
	objectKey: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert or ignore into workspace_file_versions (
      workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			workspaceId,
			path,
			version,
			objectKey,
			contentType,
			sizeBytes,
			sha256,
			updatedBy,
			createdAt
		);
}

export function createFileVersionStatementFromRow(file: WorkspaceFileRow) {
	return createFileVersionStatement({
		contentType: file.content_type,
		createdAt: file.updated_at,
		objectKey: file.object_key,
		path: file.path,
		sha256: file.sha256,
		sizeBytes: file.size_bytes,
		updatedBy: file.updated_by,
		version: file.version,
		workspaceId: file.workspace_id,
	});
}

export function createWorkspaceCommentStatement({
	anchor,
	authorId,
	body,
	createdAt,
	path,
	resolvedAt,
	resolvedBy,
	updatedAt,
	version,
	workspaceId,
}: {
	anchor: Record<string, unknown>;
	authorId: string | null;
	body: string;
	createdAt: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt: string;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert into comments (
      id, workspace_id, path, version, anchor_json, body, author_id,
      created_at, updated_at, resolved_at, resolved_by
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			path,
			version,
			JSON.stringify(anchor),
			body,
			authorId,
			createdAt,
			updatedAt,
			resolvedAt,
			resolvedBy
		);
}

export function createWorkspaceEventStatement({
	actor,
	createdAt,
	path,
	payload,
	type,
	version,
	workspaceId,
}: {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	version: number | null;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert into workspace_events (
      id, workspace_id, type, path, version, actor, created_at, payload
    ) values (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			type,
			path,
			version,
			actor,
			createdAt,
			JSON.stringify(payload)
		);
}

export function createWorkspaceAdminEventStatement({
	actor,
	createdAt,
	path,
	payload,
	type,
	workspaceId,
}: {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`insert into workspace_admin_events (
      id, workspace_id, type, path, actor, payload, created_at
    ) values (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			type,
			path,
			actor,
			JSON.stringify(payload),
			createdAt
		);
}
