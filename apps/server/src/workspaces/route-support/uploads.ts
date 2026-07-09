import type { UploadedObject } from "../domain";
import { deleteObjectBestEffort, putFileObject } from "../storage";

const DEFAULT_CONTENT_TYPE = "text/markdown; charset=utf-8";

export async function cleanupUploadedObjects(files: UploadedObject[]) {
	await Promise.all(
		files.map((file) => deleteObjectBestEffort(file.objectKey))
	);
}

export function normalizeContentType(contentType?: string) {
	return contentType ?? DEFAULT_CONTENT_TYPE;
}

export async function uploadWorkspaceObjects(
	files: Array<{ content: string; contentType: string; path: string }>,
	workspaceId: string
) {
	const uploadResults = await Promise.allSettled(
		files.map((file) =>
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

	return uploadedObjects;
}
