import {
	WORKSPACE_EXPORT_FORMAT,
	WORKSPACE_EXPORT_SCHEMA_VERSION,
	type WorkspaceExportBundle,
} from "@mdsync/contracts/workspaces";
import { workspaceBindings } from "../bindings";
import {
	buildWorkspaceUrls,
	createR2Prefix,
	createWorkspaceId,
	normalizeFilePath,
	randomCapabilityToken,
	tokenHash,
	type UploadedObject,
	validateUniquePaths,
	WorkspaceError,
} from "../domain";
import {
	createImportedWorkspaceRecords,
	fetchObjectText,
	fetchObjectTextByKey,
	listAllWorkspaceFileVersions,
	listWorkspaceAdminEvents,
	listWorkspaceComments,
	listWorkspaceEvents,
	listWorkspaceFilesDetailed,
	putFileObject,
	type WorkspaceAdminEventRow,
	type WorkspaceCommentRow,
	type WorkspaceEventRow,
	type WorkspaceFileRow,
	type WorkspaceFileVersionRow,
	type WorkspaceRow,
} from "../storage";
import { buildRetentionPolicyPayload } from "./retention";
import { parseEventPayload } from "./serialization";
import { cleanupUploadedObjects } from "./uploads";

type ImportedCurrentFile = WorkspaceExportBundle["files"][number];
type ImportedFileVersion = WorkspaceExportBundle["fileVersions"][number];

export async function exportWorkspaceBundle(workspace: WorkspaceRow) {
	const [files, fileVersions, events, comments, adminEvents] =
		await Promise.all([
			listWorkspaceFilesDetailed(workspace.id),
			listAllWorkspaceFileVersions(workspace.id),
			listWorkspaceEvents(workspace.id),
			listWorkspaceComments({ workspaceId: workspace.id }),
			listWorkspaceAdminEvents(workspace.id),
		]);

	return {
		adminEvents: adminEvents.map(serializeWorkspaceAdminEventForExport),
		comments: comments.map(serializeWorkspaceCommentForExport),
		events: events.map(serializeWorkspaceEventForExport),
		exportedAt: new Date().toISOString(),
		files: await Promise.all(files.map(serializeWorkspaceFileForExport)),
		fileVersions: await Promise.all(
			fileVersions.map(serializeWorkspaceFileVersionForExport)
		),
		format: WORKSPACE_EXPORT_FORMAT,
		retention: buildRetentionPolicyPayload(workspace).retention,
		schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
		workspace: {
			createdAt: workspace.created_at,
			id: workspace.id,
			readAccess: workspace.read_access,
			title: workspace.title,
			totalSizeBytes: workspace.total_size_bytes,
			updatedAt: workspace.updated_at,
			writeAccess: workspace.write_access,
		},
	};
}

export async function importWorkspaceBundle(
	bundle: WorkspaceExportBundle,
	request: Request
) {
	const id = createWorkspaceId();
	const now = new Date().toISOString();
	const r2Prefix = createR2Prefix(id);
	const readToken = randomCapabilityToken();
	const editToken = randomCapabilityToken();
	const readTokenHash = await tokenHash(readToken);
	const writeTokenHash = await tokenHash(editToken);
	const files = bundle.files.map((file) => ({
		...file,
		path: normalizeFilePath(file.path),
	}));
	const fileVersions = normalizeImportedFileVersions({
		files,
		versions: bundle.fileVersions,
	});
	validateUniquePaths(files.map((file) => file.path));
	validateUniqueFileVersions(fileVersions);

	const { currentUploads, versionUploads } =
		await uploadImportedWorkspaceObjects({
			files,
			fileVersions,
			workspaceId: id,
		});

	try {
		const totalSizeBytes = currentUploads.reduce(
			(total, file) => total + file.sizeBytes,
			0
		);
		await createImportedWorkspaceRecords({
			adminEvents: bundle.adminEvents.map((event) => ({
				actor: event.actor,
				createdAt: event.createdAt,
				path: normalizeNullableFilePath(event.path),
				payload: event.payload,
				type: event.type,
				workspaceId: id,
			})),
			comments: bundle.comments.map((comment) => ({
				...comment,
				path: normalizeFilePath(comment.path),
				workspaceId: id,
			})),
			createdAt: now,
			currentFiles: files.map((file, index) => ({
				contentType: file.contentType,
				createdAt: file.createdAt,
				path: file.path,
				updatedAt: file.updatedAt,
				updatedBy: file.updatedBy,
				upload: requiredUploadedObject(currentUploads, index),
				version: file.version,
			})),
			events: bundle.events.map((event) => ({
				actor: event.actor,
				createdAt: event.createdAt,
				path: normalizeNullableFilePath(event.path),
				payload: event.payload,
				type: event.type,
				version: event.version,
				workspaceId: id,
			})),
			fileVersions: fileVersions.map((fileVersion, index) => {
				const uploaded = requiredUploadedObject(versionUploads, index);
				return {
					contentType: fileVersion.contentType,
					createdAt: fileVersion.createdAt,
					objectKey: uploaded.objectKey,
					path: fileVersion.path,
					sha256: uploaded.sha256,
					sizeBytes: uploaded.sizeBytes,
					updatedBy: fileVersion.updatedBy,
					version: fileVersion.version,
					workspaceId: id,
				};
			}),
			r2Prefix,
			readTokenHash,
			title: bundle.workspace.title,
			totalSizeBytes,
			updatedAt: now,
			workspaceId: id,
			writeTokenHash,
		});
	} catch (error) {
		await cleanupUploadedObjects(currentUploads.concat(versionUploads));
		throw error;
	}

	return {
		id,
		importedAt: now,
		importedCounts: {
			adminEvents: bundle.adminEvents.length,
			comments: bundle.comments.length,
			events: bundle.events.length,
			files: files.length,
			fileVersions: fileVersions.length,
		},
		sourceWorkspaceId: bundle.workspace.id,
		title: bundle.workspace.title,
		...buildWorkspaceUrls({
			editToken,
			id,
			origin: new URL(request.url).origin,
			readAccess: "token",
			readToken,
			webOrigin: workspaceBindings().WEB_ORIGIN,
			writeAccess: "token",
		}),
	};
}

export async function uploadImportedWorkspaceObjects({
	files,
	fileVersions,
	workspaceId,
}: {
	files: ImportedCurrentFile[];
	fileVersions: ImportedFileVersion[];
	workspaceId: string;
}) {
	const descriptors = [
		...files.map((file) => ({ file, kind: "current" as const })),
		...fileVersions.map((file) => ({ file, kind: "version" as const })),
	];
	const uploadResults = await Promise.allSettled(
		descriptors.map(({ file }) =>
			putFileObject({
				content: file.content,
				contentType: file.contentType,
				path: file.path,
				workspaceId,
			})
		)
	);
	const uploadedObjects = uploadResults.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : []
	);
	const failedUpload = uploadResults.find(
		(result): result is PromiseRejectedResult => result.status === "rejected"
	);

	if (failedUpload) {
		await cleanupUploadedObjects(uploadedObjects);
		throw failedUpload.reason;
	}

	const currentUploads: UploadedObject[] = [];
	const versionUploads: UploadedObject[] = [];
	for (const [index, result] of uploadResults.entries()) {
		if (result.status !== "fulfilled") {
			continue;
		}
		if (descriptors[index]?.kind === "current") {
			currentUploads.push(result.value);
		} else {
			versionUploads.push(result.value);
		}
	}

	return { currentUploads, versionUploads };
}

export function normalizeImportedFileVersions({
	files,
	versions,
}: {
	files: ImportedCurrentFile[];
	versions: ImportedFileVersion[];
}) {
	const normalizedVersions = versions.map((fileVersion) => ({
		...fileVersion,
		path: normalizeFilePath(fileVersion.path),
	}));
	const versionKeys = new Set(
		normalizedVersions.map((fileVersion) => fileVersionKey(fileVersion))
	);

	for (const file of files) {
		const key = fileVersionKey(file);
		if (versionKeys.has(key)) {
			continue;
		}
		normalizedVersions.push({
			content: file.content,
			contentType: file.contentType,
			createdAt: file.updatedAt,
			path: file.path,
			updatedBy: file.updatedBy,
			version: file.version,
		});
		versionKeys.add(key);
	}

	return normalizedVersions;
}

export function validateUniqueFileVersions(
	fileVersions: ImportedFileVersion[]
) {
	const seen = new Set<string>();
	for (const fileVersion of fileVersions) {
		const key = fileVersionKey(fileVersion);
		if (seen.has(key)) {
			throw new WorkspaceError(
				400,
				"duplicate_file_version",
				`Duplicate file version: ${fileVersion.path}@${fileVersion.version}`
			);
		}
		seen.add(key);
	}
}

export function fileVersionKey(fileVersion: { path: string; version: number }) {
	return `${fileVersion.path}\u0000${fileVersion.version}`;
}

export function normalizeNullableFilePath(path: string | null) {
	return path === null ? null : normalizeFilePath(path);
}

export function requiredUploadedObject(files: UploadedObject[], index: number) {
	const file = files[index];
	if (!file) {
		throw new WorkspaceError(
			500,
			"missing_uploaded_object",
			"Imported file upload result is missing."
		);
	}
	return file;
}

export async function serializeWorkspaceFileForExport(file: WorkspaceFileRow) {
	return {
		content: await fetchObjectText(file),
		contentType: file.content_type,
		createdAt: file.created_at,
		path: file.path,
		updatedAt: file.updated_at,
		updatedBy: file.updated_by,
		version: file.version,
	};
}

export async function serializeWorkspaceFileVersionForExport(
	fileVersion: WorkspaceFileVersionRow
) {
	return {
		content: await fetchObjectTextByKey(fileVersion.object_key),
		contentType: fileVersion.content_type,
		createdAt: fileVersion.created_at,
		path: fileVersion.path,
		updatedBy: fileVersion.updated_by,
		version: fileVersion.version,
	};
}

export function serializeWorkspaceEventForExport(event: WorkspaceEventRow) {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		path: event.path,
		payload: parseEventPayload(event.payload),
		type: event.type,
		version: event.version,
	};
}

export function serializeWorkspaceCommentForExport(
	comment: WorkspaceCommentRow
) {
	return {
		anchor: parseEventPayload(comment.anchor_json),
		authorId: comment.author_id,
		body: comment.body,
		createdAt: comment.created_at,
		path: comment.path,
		resolvedAt: comment.resolved_at,
		resolvedBy: comment.resolved_by,
		updatedAt: comment.updated_at,
		version: comment.version,
	};
}

export function serializeWorkspaceAdminEventForExport(
	event: WorkspaceAdminEventRow
) {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		path: event.path,
		payload: parseEventPayload(event.payload),
		type: event.type,
	};
}
