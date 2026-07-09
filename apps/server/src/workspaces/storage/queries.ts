import {
	comments,
	workspaceAdminEvents,
	workspaceEvents,
	workspaceFiles,
	workspaceFileVersions,
	workspaces,
} from "@mdsync/db/schema/workspaces";
import { and, asc, eq } from "drizzle-orm";
import { workspaceDb } from "../bindings";
import type { WorkspaceTreeFile } from "./types";

const workspaceRowSelection = {
	created_at: workspaces.createdAt,
	file_count: workspaces.fileCount,
	id: workspaces.id,
	last_accessed_at: workspaces.lastAccessedAt,
	r2_prefix: workspaces.r2Prefix,
	read_access: workspaces.readAccess,
	read_token_hash: workspaces.readTokenHash,
	title: workspaces.title,
	total_size_bytes: workspaces.totalSizeBytes,
	updated_at: workspaces.updatedAt,
	write_access: workspaces.writeAccess,
	write_token_hash: workspaces.writeTokenHash,
};

const workspaceFileRowSelection = {
	content_type: workspaceFiles.contentType,
	created_at: workspaceFiles.createdAt,
	object_key: workspaceFiles.objectKey,
	path: workspaceFiles.path,
	sha256: workspaceFiles.sha256,
	size_bytes: workspaceFiles.sizeBytes,
	updated_at: workspaceFiles.updatedAt,
	updated_by: workspaceFiles.updatedBy,
	version: workspaceFiles.version,
	workspace_id: workspaceFiles.workspaceId,
};

const workspaceEventRowSelection = {
	actor: workspaceEvents.actor,
	created_at: workspaceEvents.createdAt,
	id: workspaceEvents.id,
	path: workspaceEvents.path,
	payload: workspaceEvents.payload,
	type: workspaceEvents.type,
	version: workspaceEvents.version,
	workspace_id: workspaceEvents.workspaceId,
};

const workspaceFileVersionRowSelection = {
	content_type: workspaceFileVersions.contentType,
	created_at: workspaceFileVersions.createdAt,
	object_key: workspaceFileVersions.objectKey,
	path: workspaceFileVersions.path,
	sha256: workspaceFileVersions.sha256,
	size_bytes: workspaceFileVersions.sizeBytes,
	updated_by: workspaceFileVersions.updatedBy,
	version: workspaceFileVersions.version,
	workspace_id: workspaceFileVersions.workspaceId,
};

const workspaceCommentRowSelection = {
	anchor_json: comments.anchorJson,
	author_id: comments.authorId,
	body: comments.body,
	created_at: comments.createdAt,
	id: comments.id,
	path: comments.path,
	resolved_at: comments.resolvedAt,
	resolved_by: comments.resolvedBy,
	updated_at: comments.updatedAt,
	version: comments.version,
	workspace_id: comments.workspaceId,
};

const workspaceAdminEventRowSelection = {
	actor: workspaceAdminEvents.actor,
	created_at: workspaceAdminEvents.createdAt,
	id: workspaceAdminEvents.id,
	path: workspaceAdminEvents.path,
	payload: workspaceAdminEvents.payload,
	type: workspaceAdminEvents.type,
	workspace_id: workspaceAdminEvents.workspaceId,
};

export async function getWorkspaceFileVersion({
	path,
	version,
	workspaceId,
}: {
	path: string;
	version: number;
	workspaceId: string;
}) {
	const row = await workspaceDb()
		.select(workspaceFileVersionRowSelection)
		.from(workspaceFileVersions)
		.where(
			and(
				eq(workspaceFileVersions.workspaceId, workspaceId),
				eq(workspaceFileVersions.path, path),
				eq(workspaceFileVersions.version, version)
			)
		)
		.get();
	return row ?? null;
}

export async function getFile(workspaceId: string, path: string) {
	const row = await workspaceDb()
		.select(workspaceFileRowSelection)
		.from(workspaceFiles)
		.where(
			and(
				eq(workspaceFiles.workspaceId, workspaceId),
				eq(workspaceFiles.path, path)
			)
		)
		.get();
	return row ?? null;
}

export async function getWorkspace(id: string) {
	const row = await workspaceDb()
		.select(workspaceRowSelection)
		.from(workspaces)
		.where(eq(workspaces.id, id))
		.get();
	return row ?? null;
}

export async function listWorkspaceFiles(workspaceId: string) {
	const results = await workspaceDb()
		.select({
			content_type: workspaceFiles.contentType,
			path: workspaceFiles.path,
			updated_at: workspaceFiles.updatedAt,
			updated_by: workspaceFiles.updatedBy,
			version: workspaceFiles.version,
		})
		.from(workspaceFiles)
		.where(eq(workspaceFiles.workspaceId, workspaceId))
		.orderBy(asc(workspaceFiles.path));

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

export async function listWorkspaceEvents(workspaceId: string) {
	const rows = await workspaceDb()
		.select(workspaceEventRowSelection)
		.from(workspaceEvents)
		.where(eq(workspaceEvents.workspaceId, workspaceId))
		.orderBy(asc(workspaceEvents.createdAt), asc(workspaceEvents.id));
	return rows;
}

export async function recordWorkspaceAdminEvent({
	actor,
	path,
	payload,
	type,
	workspaceId,
}: {
	actor: string | null;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	workspaceId: string;
}) {
	await workspaceDb()
		.insert(workspaceAdminEvents)
		.values({
			actor,
			createdAt: new Date().toISOString(),
			id: crypto.randomUUID(),
			path,
			payload: JSON.stringify(payload),
			type,
			workspaceId,
		})
		.run();
}

export async function listWorkspaceFileVersions(
	workspaceId: string,
	path: string
) {
	const rows = await workspaceDb()
		.select(workspaceFileVersionRowSelection)
		.from(workspaceFileVersions)
		.where(
			and(
				eq(workspaceFileVersions.workspaceId, workspaceId),
				eq(workspaceFileVersions.path, path)
			)
		)
		.orderBy(asc(workspaceFileVersions.version));
	return rows;
}

export async function listWorkspaceFilesDetailed(workspaceId: string) {
	const rows = await workspaceDb()
		.select(workspaceFileRowSelection)
		.from(workspaceFiles)
		.where(eq(workspaceFiles.workspaceId, workspaceId))
		.orderBy(asc(workspaceFiles.path));
	return rows;
}

export async function listAllWorkspaceFileVersions(workspaceId: string) {
	const rows = await workspaceDb()
		.select(workspaceFileVersionRowSelection)
		.from(workspaceFileVersions)
		.where(eq(workspaceFileVersions.workspaceId, workspaceId))
		.orderBy(
			asc(workspaceFileVersions.path),
			asc(workspaceFileVersions.version)
		);
	return rows;
}

export async function listWorkspaceComments({
	path,
	workspaceId,
}: {
	path?: string;
	workspaceId: string;
}) {
	const rows = await workspaceDb()
		.select(workspaceCommentRowSelection)
		.from(comments)
		.where(
			path
				? and(eq(comments.workspaceId, workspaceId), eq(comments.path, path))
				: eq(comments.workspaceId, workspaceId)
		)
		.orderBy(asc(comments.createdAt), asc(comments.id));
	return rows;
}

export async function listWorkspaceAdminEvents(workspaceId: string) {
	const rows = await workspaceDb()
		.select(workspaceAdminEventRowSelection)
		.from(workspaceAdminEvents)
		.where(eq(workspaceAdminEvents.workspaceId, workspaceId))
		.orderBy(asc(workspaceAdminEvents.createdAt), asc(workspaceAdminEvents.id));
	return rows;
}

export async function getWorkspaceComment({
	commentId,
	workspaceId,
}: {
	commentId: string;
	workspaceId: string;
}) {
	const row = await workspaceDb()
		.select(workspaceCommentRowSelection)
		.from(comments)
		.where(
			and(eq(comments.workspaceId, workspaceId), eq(comments.id, commentId))
		)
		.get();
	return row ?? null;
}
