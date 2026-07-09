import { HA2HA_CONFLICT } from "@ha2ha/protocol";
import { fetchObjectText, getFile, recordWorkspaceAdminEvent, type WorkspaceFileRow } from "../storage";

const VERSION_CONFLICT_ADMIN_EVENT_TYPE = "file.version_conflict";

export async function recordVersionConflict({
	actor,
	baseVersion,
	operation,
	path,
	workspaceId,
}: {
	actor: string | null;
	baseVersion: number | null;
	operation: "create" | "delete" | "update";
	path: string;
	workspaceId: string;
}) {
	const latest = await getFile(workspaceId, path);
	await recordWorkspaceAdminEvent({
		actor,
		path,
		payload: {
			baseVersion,
			latestVersion: latest?.version ?? null,
			operation,
		},
		type: VERSION_CONFLICT_ADMIN_EVENT_TYPE,
		workspaceId,
	});
}

export async function versionConflictPayload(
	workspaceId: string,
	path: string
) {
	const latest = await getFile(workspaceId, path);
	return {
		error: HA2HA_CONFLICT.error,
		latest: latest ? await serializeLatestConflictFile(latest) : null,
		message: HA2HA_CONFLICT.message,
	};
}

export async function serializeLatestConflictFile(file: WorkspaceFileRow) {
	return {
		content: await fetchObjectText(file),
		contentType: file.content_type,
		path: file.path,
		updatedAt: file.updated_at,
		updatedBy: file.updated_by,
		version: file.version,
		workspaceId: file.workspace_id,
	};
}
