import { HA2HA_EVENT_TYPES } from "@ha2ha/protocol";
import type { MdsyncDb } from "@mdsync/db/client";
import {
	comments,
	workspaceAdminEvents,
	workspaceEvents,
	workspaceFiles,
	workspaceFileVersions,
	workspaces,
} from "@mdsync/db/schema/workspaces";
import { and, eq, sql } from "drizzle-orm";
import { workspaceDb } from "../bindings";
import type { ReadAccess, UploadedObject, WriteAccess } from "../domain";
import type { WorkspaceFileRow } from "./types";

interface WorkspaceRecordParams {
	actor: string | null;
	createdAt: string;
	files: UploadedObject[];
	r2Prefix: string;
	readAccess: ReadAccess;
	readTokenHash: string | null;
	title: string | null;
	totalSizeBytes: number;
	updatedAt: string;
	workspaceId: string;
	writeAccess: WriteAccess;
	writeTokenHash: string | null;
}

interface WorkspaceFileVersionParams {
	contentType: string;
	createdAt: string;
	objectKey: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

interface WorkspaceEventParams {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	version: number | null;
	workspaceId: string;
}

interface WorkspaceAdminEventParams {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	workspaceId: string;
}

interface WorkspaceCommentParams {
	anchor: Record<string, unknown>;
	authorId: string | null;
	body: string;
	createdAt: string;
	id?: string;
	path: string;
	resolvedAt?: string | null;
	resolvedBy?: string | null;
	updatedAt: string;
	version: number;
	workspaceId: string;
}

interface ImportedCurrentFile {
	contentType: string;
	createdAt: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	upload: UploadedObject;
	version: number;
}

interface ImportedWorkspaceRecordsParams {
	adminEvents: WorkspaceAdminEventParams[];
	comments: WorkspaceCommentParams[];
	createdAt: string;
	currentFiles: ImportedCurrentFile[];
	events: WorkspaceEventParams[];
	fileVersions: WorkspaceFileVersionParams[];
	r2Prefix: string;
	readTokenHash: string;
	title: string | null;
	totalSizeBytes: number;
	updatedAt: string;
	workspaceId: string;
	writeTokenHash: string;
}

export async function createWorkspaceRecords({
	actor,
	createdAt,
	files,
	r2Prefix,
	readAccess,
	readTokenHash,
	title,
	totalSizeBytes,
	updatedAt,
	workspaceId,
	writeAccess,
	writeTokenHash,
}: WorkspaceRecordParams) {
	const db = workspaceDb();
	await db.batch([
		db.insert(workspaces).values({
			createdAt,
			fileCount: files.length,
			id: workspaceId,
			lastAccessedAt: null,
			r2Prefix,
			readAccess,
			readTokenHash,
			title,
			totalSizeBytes,
			updatedAt,
			writeAccess,
			writeTokenHash,
		}),
		...files.map((file) =>
			insertCurrentFileQuery(db, {
				createdAt,
				path: file.path,
				updatedAt,
				updatedBy: actor,
				upload: file,
				version: 1,
				workspaceId,
			})
		),
		...files.map((file) =>
			insertFileVersionQuery(db, {
				contentType: file.contentType,
				createdAt,
				objectKey: file.objectKey,
				path: file.path,
				sha256: file.sha256,
				sizeBytes: file.sizeBytes,
				updatedBy: actor,
				version: 1,
				workspaceId,
			})
		),
		...files.map((file) =>
			insertWorkspaceEventQuery(db, {
				actor,
				createdAt,
				path: file.path,
				payload: { sizeBytes: file.sizeBytes },
				type: HA2HA_EVENT_TYPES.fileCreated,
				version: 1,
				workspaceId,
			})
		),
	]);
}

export async function createImportedWorkspaceRecords({
	adminEvents,
	comments: importedComments,
	createdAt,
	currentFiles,
	events,
	fileVersions,
	r2Prefix,
	readTokenHash,
	title,
	totalSizeBytes,
	updatedAt,
	workspaceId,
	writeTokenHash,
}: ImportedWorkspaceRecordsParams) {
	const db = workspaceDb();
	await db.batch([
		db.insert(workspaces).values({
			createdAt,
			fileCount: currentFiles.length,
			id: workspaceId,
			lastAccessedAt: null,
			r2Prefix,
			readAccess: "token",
			readTokenHash,
			title,
			totalSizeBytes,
			updatedAt,
			writeAccess: "token",
			writeTokenHash,
		}),
		...currentFiles.map((file) =>
			insertCurrentFileQuery(db, {
				createdAt: file.createdAt,
				path: file.path,
				updatedAt: file.updatedAt,
				updatedBy: file.updatedBy,
				upload: file.upload,
				version: file.version,
				workspaceId,
			})
		),
		...fileVersions.map((fileVersion) =>
			insertFileVersionQuery(db, fileVersion)
		),
		...events.map((event) => insertWorkspaceEventQuery(db, event)),
		...importedComments.map((comment) => insertCommentQuery(db, comment)),
		...adminEvents.map((event) => insertWorkspaceAdminEventQuery(db, event)),
	]);
}

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
	await workspaceDb()
		.update(workspaces)
		.set({
			fileCount: sql`${workspaces.fileCount} + ${fileCountDelta}`,
			totalSizeBytes: sql`${workspaces.totalSizeBytes} + ${sizeDelta}`,
			updatedAt: now,
		})
		.where(eq(workspaces.id, workspaceId))
		.run();
}

export async function updateCurrentWorkspaceFile({
	actor,
	baseVersion,
	now,
	path,
	uploaded,
	workspaceId,
}: {
	actor: string | null;
	baseVersion: number;
	now: string;
	path: string;
	uploaded: UploadedObject;
	workspaceId: string;
}) {
	const result = await workspaceDb()
		.update(workspaceFiles)
		.set({
			contentType: uploaded.contentType,
			objectKey: uploaded.objectKey,
			sha256: uploaded.sha256,
			sizeBytes: uploaded.sizeBytes,
			updatedAt: now,
			updatedBy: actor,
			version: sql`${workspaceFiles.version} + 1`,
		})
		.where(
			and(
				eq(workspaceFiles.workspaceId, workspaceId),
				eq(workspaceFiles.path, path),
				eq(workspaceFiles.version, baseVersion)
			)
		)
		.run();
	return result.meta.changes ?? 0;
}

export async function createCurrentWorkspaceFile({
	actor,
	now,
	path,
	uploaded,
	workspaceId,
}: {
	actor: string | null;
	now: string;
	path: string;
	uploaded: UploadedObject;
	workspaceId: string;
}) {
	const db = workspaceDb();
	await db.batch([
		insertCurrentFileQuery(db, {
			createdAt: now,
			path,
			updatedAt: now,
			updatedBy: actor,
			upload: uploaded,
			version: 1,
			workspaceId,
		}),
		insertFileVersionQuery(db, {
			contentType: uploaded.contentType,
			createdAt: now,
			objectKey: uploaded.objectKey,
			path,
			sha256: uploaded.sha256,
			sizeBytes: uploaded.sizeBytes,
			updatedBy: actor,
			version: 1,
			workspaceId,
		}),
		insertWorkspaceEventQuery(db, {
			actor,
			createdAt: now,
			path,
			payload: { baseVersion: null },
			type: HA2HA_EVENT_TYPES.fileCreated,
			version: 1,
			workspaceId,
		}),
	]);
}

export async function appendUpdatedWorkspaceFileRecords({
	actor,
	current,
	now,
	path,
	uploaded,
	workspaceId,
}: {
	actor: string | null;
	current: WorkspaceFileRow;
	now: string;
	path: string;
	uploaded: UploadedObject;
	workspaceId: string;
}) {
	const db = workspaceDb();
	await db.batch([
		insertFileVersionFromRowQuery(db, current),
		insertFileVersionQuery(db, {
			contentType: uploaded.contentType,
			createdAt: now,
			objectKey: uploaded.objectKey,
			path,
			sha256: uploaded.sha256,
			sizeBytes: uploaded.sizeBytes,
			updatedBy: actor,
			version: current.version + 1,
			workspaceId,
		}),
		insertWorkspaceEventQuery(db, {
			actor,
			createdAt: now,
			path,
			payload: { baseVersion: current.version },
			type: HA2HA_EVENT_TYPES.fileUpdated,
			version: current.version + 1,
			workspaceId,
		}),
	]);
}

export async function deleteCurrentWorkspaceFile({
	baseVersion,
	path,
	workspaceId,
}: {
	baseVersion: number;
	path: string;
	workspaceId: string;
}) {
	const result = await workspaceDb()
		.delete(workspaceFiles)
		.where(
			and(
				eq(workspaceFiles.workspaceId, workspaceId),
				eq(workspaceFiles.path, path),
				eq(workspaceFiles.version, baseVersion)
			)
		)
		.run();
	return result.meta.changes ?? 0;
}

export async function appendDeletedWorkspaceFileRecords({
	actor,
	current,
	now,
	workspaceId,
}: {
	actor: string | null;
	current: WorkspaceFileRow;
	now: string;
	workspaceId: string;
}) {
	const db = workspaceDb();
	await db.batch([
		insertFileVersionFromRowQuery(db, current),
		insertWorkspaceEventQuery(db, {
			actor,
			createdAt: now,
			path: current.path,
			payload: { baseVersion: current.version },
			type: HA2HA_EVENT_TYPES.fileDeleted,
			version: current.version,
			workspaceId,
		}),
	]);
}

export async function rotateReadCapability({
	hashedToken,
	now,
	workspaceId,
}: {
	hashedToken: string;
	now: string;
	workspaceId: string;
}) {
	await workspaceDb()
		.update(workspaces)
		.set({ readAccess: "token", readTokenHash: hashedToken, updatedAt: now })
		.where(eq(workspaces.id, workspaceId))
		.run();
}

export async function rotateEditCapability({
	hashedToken,
	now,
	workspaceId,
}: {
	hashedToken: string;
	now: string;
	workspaceId: string;
}) {
	await workspaceDb()
		.update(workspaces)
		.set({ updatedAt: now, writeAccess: "token", writeTokenHash: hashedToken })
		.where(eq(workspaces.id, workspaceId))
		.run();
}

export async function revokeReadCapability({
	now,
	workspaceId,
}: {
	now: string;
	workspaceId: string;
}) {
	await workspaceDb()
		.update(workspaces)
		.set({ readAccess: "token", readTokenHash: null, updatedAt: now })
		.where(eq(workspaces.id, workspaceId))
		.run();
}

export async function revokeEditCapability({
	now,
	workspaceId,
}: {
	now: string;
	workspaceId: string;
}) {
	await workspaceDb()
		.update(workspaces)
		.set({ updatedAt: now, writeAccess: "none", writeTokenHash: null })
		.where(eq(workspaces.id, workspaceId))
		.run();
}

export async function createWorkspaceComment({
	anchor,
	authorId,
	body,
	createdAt,
	id,
	path,
	updatedAt,
	version,
	workspaceId,
}: WorkspaceCommentParams & { id: string }) {
	await workspaceDb()
		.insert(comments)
		.values({
			anchorJson: JSON.stringify(anchor),
			authorId,
			body,
			createdAt,
			id,
			path,
			updatedAt,
			version,
			workspaceId,
		})
		.run();
}

export async function resolveWorkspaceComment({
	actor,
	commentId,
	now,
	workspaceId,
}: {
	actor: string | null;
	commentId: string;
	now: string;
	workspaceId: string;
}) {
	await workspaceDb()
		.update(comments)
		.set({ resolvedAt: now, resolvedBy: actor, updatedAt: now })
		.where(
			and(eq(comments.workspaceId, workspaceId), eq(comments.id, commentId))
		)
		.run();
}

function insertCurrentFileQuery(
	db: MdsyncDb,
	{
		createdAt,
		path,
		updatedAt,
		updatedBy,
		upload,
		version,
		workspaceId,
	}: {
		createdAt: string;
		path: string;
		updatedAt: string;
		updatedBy: string | null;
		upload: UploadedObject;
		version: number;
		workspaceId: string;
	}
) {
	return db.insert(workspaceFiles).values({
		contentType: upload.contentType,
		createdAt,
		objectKey: upload.objectKey,
		path,
		sha256: upload.sha256,
		sizeBytes: upload.sizeBytes,
		updatedAt,
		updatedBy,
		version,
		workspaceId,
	});
}

function insertFileVersionQuery(
	db: MdsyncDb,
	{
		contentType,
		createdAt,
		objectKey,
		path,
		sha256,
		sizeBytes,
		updatedBy,
		version,
		workspaceId,
	}: WorkspaceFileVersionParams
) {
	return db
		.insert(workspaceFileVersions)
		.values({
			contentType,
			createdAt,
			objectKey,
			path,
			sha256,
			sizeBytes,
			updatedBy,
			version,
			workspaceId,
		})
		.onConflictDoNothing();
}

function insertFileVersionFromRowQuery(db: MdsyncDb, file: WorkspaceFileRow) {
	return insertFileVersionQuery(db, {
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

function insertCommentQuery(db: MdsyncDb, comment: WorkspaceCommentParams) {
	return db.insert(comments).values({
		anchorJson: JSON.stringify(comment.anchor),
		authorId: comment.authorId,
		body: comment.body,
		createdAt: comment.createdAt,
		id: comment.id ?? crypto.randomUUID(),
		path: comment.path,
		resolvedAt: comment.resolvedAt ?? null,
		resolvedBy: comment.resolvedBy ?? null,
		updatedAt: comment.updatedAt,
		version: comment.version,
		workspaceId: comment.workspaceId,
	});
}

function insertWorkspaceEventQuery(db: MdsyncDb, event: WorkspaceEventParams) {
	return db.insert(workspaceEvents).values({
		actor: event.actor,
		createdAt: event.createdAt,
		id: crypto.randomUUID(),
		path: event.path,
		payload: JSON.stringify(event.payload),
		type: event.type,
		version: event.version,
		workspaceId: event.workspaceId,
	});
}

function insertWorkspaceAdminEventQuery(
	db: MdsyncDb,
	event: WorkspaceAdminEventParams
) {
	return db.insert(workspaceAdminEvents).values({
		actor: event.actor,
		createdAt: event.createdAt,
		id: crypto.randomUUID(),
		path: event.path,
		payload: JSON.stringify(event.payload),
		type: event.type,
		workspaceId: event.workspaceId,
	});
}
