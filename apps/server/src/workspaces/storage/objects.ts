import { workspaceBindings } from "../bindings";
import {
	contentSizeBytes,
	createObjectKey,
	sha256Hex,
	type UploadedObject,
	WorkspaceError,
} from "../domain";
import type { WorkspaceFileRow } from "./types";

export async function deleteObjectBestEffort(objectKey: string) {
	try {
		await workspaceBindings().FILES.delete(objectKey);
	} catch {
		// Cleanup is best-effort; callers preserve the canonical D1 state.
	}
}

export function fetchObjectText(file: WorkspaceFileRow) {
	return fetchObjectTextByKey(file.object_key);
}

export async function fetchObjectTextByKey(objectKey: string) {
	const object = await workspaceBindings().FILES.get(objectKey);
	if (!object) {
		throw new WorkspaceError(
			500,
			"missing_object",
			"File metadata exists but object storage is missing content."
		);
	}
	return object.text();
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

	await workspaceBindings().FILES.put(objectKey, content, {
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
	const object = await workspaceBindings().FILES.get(file.object_key);
	if (!object) {
		throw new WorkspaceError(
			500,
			"missing_object",
			"File metadata exists but object storage is missing content."
		);
	}
	return object.body;
}
