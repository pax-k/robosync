import type { WorkspaceRetentionPruneRequest } from "@mdsync/contracts/workspaces";
import { workspaceBindings } from "../bindings";
import { WorkspaceError } from "../domain";
import { deleteObjectBestEffort, type WorkspaceRow } from "../storage";

export function buildRetentionPolicyPayload(workspace: WorkspaceRow) {
	return {
		generatedAt: new Date().toISOString(),
		retention: {
			cleanup: {
				orphanedObjects: {
					mode: "explicit_scoped_keys",
					r2Prefix: workspace.r2_prefix,
				},
			},
			coverage: [
				"workspaces",
				"file versions",
				"protocol events",
				"comments",
				"admin events",
				"orphaned objects",
			],
			defaults: {
				adminEvents: "manual prune by created_at",
				comments: "manual prune for resolved comments only",
				events: "manual prune by created_at",
				fileVersions:
					"manual prune except current or comment-anchored versions",
				orphanedObjects: "manual explicit-key cleanup within workspace prefix",
				workspaces: "workspace metadata cascades through D1 relationships",
			},
			perWorkspaceD1: {
				reason:
					"No isolation or scale evidence currently justifies per-workspace D1.",
				status: "deferred",
			},
			status: "manual",
		},
		workspaceId: workspace.id,
	};
}

export async function pruneWorkspaceRetention({
	before,
	include,
	orphanedObjectKeys,
	workspace,
}: {
	before: string;
	include: WorkspaceRetentionPruneRequest["include"];
	orphanedObjectKeys: string[];
	workspace: WorkspaceRow;
}) {
	const resolvedComments = include.resolvedComments
		? await deleteExpiredResolvedComments(workspace.id, before)
		: 0;
	const fileVersionPrune = include.fileVersions
		? await deleteExpiredFileVersions(workspace.id, before)
		: { objectKeysDeleted: 0, rowsDeleted: 0 };
	const events = include.events
		? await deleteExpiredRows({
				before,
				table: "workspace_events",
				workspaceId: workspace.id,
			})
		: 0;
	const adminEvents = include.adminEvents
		? await deleteExpiredRows({
				before,
				table: "workspace_admin_events",
				workspaceId: workspace.id,
			})
		: 0;
	const orphanedObjects = await deleteExplicitWorkspaceObjects({
		objectKeys: orphanedObjectKeys,
		workspace,
	});

	return {
		before,
		pruned: {
			adminEvents,
			events,
			fileVersionObjects: fileVersionPrune.objectKeysDeleted,
			fileVersions: fileVersionPrune.rowsDeleted,
			orphanedObjects: orphanedObjects.deleted,
			resolvedComments,
		},
		skipped: {
			orphanedObjects: orphanedObjects.skipped,
		},
		workspaceId: workspace.id,
	};
}

export function parseRetentionBefore(value: string) {
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) {
		throw new WorkspaceError(
			400,
			"invalid_retention_cutoff",
			"Retention cutoff must be an ISO-compatible timestamp."
		);
	}
	return new Date(timestamp).toISOString();
}

export async function deleteExpiredResolvedComments(
	workspaceId: string,
	before: string
) {
	const result = await workspaceBindings()
		.DB.prepare(
			`delete from comments
       where workspace_id = ? and resolved_at is not null and updated_at < ?`
		)
		.bind(workspaceId, before)
		.run();
	return result.meta.changes ?? 0;
}

export async function deleteExpiredRows({
	before,
	table,
	workspaceId,
}: {
	before: string;
	table: "workspace_admin_events" | "workspace_events";
	workspaceId: string;
}) {
	const result = await workspaceBindings()
		.DB.prepare(
			`delete from ${table} where workspace_id = ? and created_at < ?`
		)
		.bind(workspaceId, before)
		.run();
	return result.meta.changes ?? 0;
}

export async function deleteExpiredFileVersions(
	workspaceId: string,
	before: string
) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select v.object_key
       from workspace_file_versions v
       where v.workspace_id = ?
         and v.created_at < ?
         and not exists (
           select 1
           from workspace_files f
           where f.workspace_id = v.workspace_id
             and f.path = v.path
             and f.version = v.version
         )
         and not exists (
           select 1
           from comments c
           where c.workspace_id = v.workspace_id
             and c.path = v.path
             and c.version = v.version
         )`
		)
		.bind(workspaceId, before)
		.all<{ object_key: string }>();
	const objectKeys = [...new Set(results.map((row) => row.object_key))];
	const result = await workspaceBindings()
		.DB.prepare(
			`delete from workspace_file_versions
       where workspace_id = ?
         and created_at < ?
         and not exists (
           select 1
           from workspace_files f
           where f.workspace_id = workspace_file_versions.workspace_id
             and f.path = workspace_file_versions.path
             and f.version = workspace_file_versions.version
         )
         and not exists (
           select 1
           from comments c
           where c.workspace_id = workspace_file_versions.workspace_id
             and c.path = workspace_file_versions.path
             and c.version = workspace_file_versions.version
         )`
		)
		.bind(workspaceId, before)
		.run();

	await Promise.all(
		objectKeys.map((objectKey) => deleteObjectBestEffort(objectKey))
	);

	return {
		objectKeysDeleted: objectKeys.length,
		rowsDeleted: result.meta.changes ?? 0,
	};
}

export async function deleteExplicitWorkspaceObjects({
	objectKeys,
	workspace,
}: {
	objectKeys: string[];
	workspace: WorkspaceRow;
}) {
	let skipped = 0;
	const seen = new Set<string>();
	const scopedObjectKeys: string[] = [];

	for (const objectKey of objectKeys) {
		if (seen.has(objectKey)) {
			continue;
		}
		seen.add(objectKey);

		if (!isWorkspaceObjectKey(workspace, objectKey)) {
			skipped += 1;
			continue;
		}

		scopedObjectKeys.push(objectKey);
	}

	await Promise.all(
		scopedObjectKeys.map((objectKey) => deleteObjectBestEffort(objectKey))
	);

	return { deleted: scopedObjectKeys.length, skipped };
}

export function isWorkspaceObjectKey(
	workspace: WorkspaceRow,
	objectKey: string
) {
	return objectKey.startsWith(`${workspace.r2_prefix}/`);
}
