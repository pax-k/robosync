import { env } from "@mdsync/env/server";

import {
	contentSizeBytes,
	createObjectKey,
	type ReadAccess,
	sha256Hex,
	type UploadedObject,
	WorkspaceError,
	type WriteAccess,
} from "./domain";

export interface WorkspaceRow {
	created_at: string;
	file_count: number;
	id: string;
	last_accessed_at: string | null;
	r2_prefix: string;
	read_access: ReadAccess;
	read_token_hash: string | null;
	title: string | null;
	total_size_bytes: number;
	updated_at: string;
	write_access: WriteAccess;
	write_token_hash: string | null;
}

export interface WorkspaceFileRow {
	content_type: string;
	created_at: string;
	object_key: string;
	path: string;
	sha256: string | null;
	size_bytes: number;
	updated_at: string;
	updated_by: string | null;
	version: number;
	workspace_id: string;
}

export interface WorkspaceTreeFile {
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
}

export async function deleteObjectBestEffort(objectKey: string) {
	try {
		await env.FILES.delete(objectKey);
	} catch {
		// Cleanup is best-effort; callers preserve the canonical D1 state.
	}
}

export async function fetchObjectText(file: WorkspaceFileRow) {
	const object = await env.FILES.get(file.object_key);
	if (!object) {
		throw new WorkspaceError(
			500,
			"missing_object",
			"File metadata exists but object storage is missing content."
		);
	}
	return object.text();
}

export function getFile(workspaceId: string, path: string) {
	return env.DB.prepare(
		`select workspace_id, path, object_key, content_type, size_bytes, sha256, version, updated_by, created_at, updated_at
     from workspace_files
     where workspace_id = ? and path = ?`
	)
		.bind(workspaceId, path)
		.first<WorkspaceFileRow>();
}

export function getWorkspace(id: string) {
	return env.DB.prepare(
		`select id, title, read_access, write_access, read_token_hash, write_token_hash, r2_prefix, file_count, total_size_bytes, created_at, updated_at, last_accessed_at
     from workspaces
     where id = ?`
	)
		.bind(id)
		.first<WorkspaceRow>();
}

export async function listWorkspaceFiles(workspaceId: string) {
	const { results } = await env.DB.prepare(
		`select path, content_type, version, updated_by, updated_at
     from workspace_files
     where workspace_id = ?
     order by path asc`
	)
		.bind(workspaceId)
		.all<{
			content_type: string;
			path: string;
			updated_at: string;
			updated_by: string | null;
			version: number;
		}>();

	return results.map(
		(row): WorkspaceTreeFile => ({
			contentType: row.content_type,
			path: row.path,
			updatedAt: row.updated_at,
			updatedBy: row.updated_by,
			version: row.version,
		})
	);
}

export async function putFileObject({
	content,
	contentType,
	path,
	workspaceId,
}: {
	content: string;
	contentType: string;
	path: string;
	workspaceId: string;
}): Promise<UploadedObject> {
	const objectKey = createObjectKey(workspaceId);
	const sha256 = await sha256Hex(content);
	const sizeBytes = contentSizeBytes(content);

	await env.FILES.put(objectKey, content, {
		customMetadata: {
			path,
			sha256,
			workspaceId,
		},
		httpMetadata: {
			contentType,
		},
	});

	return {
		contentType,
		objectKey,
		path,
		sha256,
		sizeBytes,
	};
}

export async function readObjectBody(file: WorkspaceFileRow) {
	const object = await env.FILES.get(file.object_key);
	if (!object) {
		throw new WorkspaceError(
			500,
			"missing_object",
			"File metadata exists but object storage is missing content."
		);
	}
	return object.body;
}
