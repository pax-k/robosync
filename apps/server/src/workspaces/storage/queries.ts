import { workspaceBindings } from "../bindings";
import type {
	WorkspaceAdminEventRow,
	WorkspaceCommentRow,
	WorkspaceEventRow,
	WorkspaceFileRow,
	WorkspaceFileVersionRow,
	WorkspaceRow,
	WorkspaceTreeFile,
} from "./types";

export function getWorkspaceFileVersion({
	path,
	version,
	workspaceId,
}: {
	path: string;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
     from workspace_file_versions
     where workspace_id = ? and path = ? and version = ?`
		)
		.bind(workspaceId, path, version)
		.first<WorkspaceFileVersionRow>();
}

export function getFile(workspaceId: string, path: string) {
	return workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, object_key, content_type, size_bytes, sha256, version, updated_by, created_at, updated_at
     from workspace_files
     where workspace_id = ? and path = ?`
		)
		.bind(workspaceId, path)
		.first<WorkspaceFileRow>();
}

export function getWorkspace(id: string) {
	return workspaceBindings()
		.DB.prepare(
			`select id, title, read_access, write_access, read_token_hash, write_token_hash, r2_prefix, file_count, total_size_bytes, created_at, updated_at, last_accessed_at
     from workspaces
     where id = ?`
		)
		.bind(id)
		.first<WorkspaceRow>();
}

export async function listWorkspaceFiles(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
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

export async function listWorkspaceEvents(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select id, workspace_id, type, path, version, actor, created_at, payload
     from workspace_events
     where workspace_id = ?
     order by created_at asc, id asc`
		)
		.bind(workspaceId)
		.all<WorkspaceEventRow>();

	return results;
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
	await workspaceBindings()
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
			new Date().toISOString()
		)
		.run();
}

export async function listWorkspaceFileVersions(
	workspaceId: string,
	path: string
) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
     from workspace_file_versions
     where workspace_id = ? and path = ?
     order by version asc`
		)
		.bind(workspaceId, path)
		.all<WorkspaceFileVersionRow>();

	return results;
}

export async function listWorkspaceFilesDetailed(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, object_key, content_type, size_bytes, sha256, version, updated_by, created_at, updated_at
     from workspace_files
     where workspace_id = ?
     order by path asc`
		)
		.bind(workspaceId)
		.all<WorkspaceFileRow>();

	return results;
}

export async function listAllWorkspaceFileVersions(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
     from workspace_file_versions
     where workspace_id = ?
     order by path asc, version asc`
		)
		.bind(workspaceId)
		.all<WorkspaceFileVersionRow>();

	return results;
}

export async function listWorkspaceComments({
	path,
	workspaceId,
}: {
	path?: string;
	workspaceId: string;
}) {
	const baseQuery = `select id, workspace_id, path, version, anchor_json, body, author_id, created_at, updated_at, resolved_at, resolved_by
     from comments
     where workspace_id = ?`;
	const pathClause = path ? " and path = ?" : "";
	const orderClause = " order by created_at asc, id asc";
	const statement = workspaceBindings()
		.DB.prepare(`${baseQuery}${pathClause}${orderClause}`)
		.bind(...(path ? [workspaceId, path] : [workspaceId]));
	const { results } = await statement.all<WorkspaceCommentRow>();

	return results;
}

export async function listWorkspaceAdminEvents(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select id, workspace_id, type, path, actor, payload, created_at
     from workspace_admin_events
     where workspace_id = ?
     order by created_at asc, id asc`
		)
		.bind(workspaceId)
		.all<WorkspaceAdminEventRow>();

	return results;
}

export function getWorkspaceComment({
	commentId,
	workspaceId,
}: {
	commentId: string;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`select id, workspace_id, path, version, anchor_json, body, author_id, created_at, updated_at, resolved_at, resolved_by
     from comments
     where workspace_id = ? and id = ?`
		)
		.bind(workspaceId, commentId)
		.first<WorkspaceCommentRow>();
}
