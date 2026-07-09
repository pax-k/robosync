import { ha2haConflictResponseSchema } from "@ha2ha/protocol";
import {
	contentTypeForPath,
	DEFAULT_CONTENT_TYPE,
	err,
	getNumber,
	getOptionalNumber,
	getOptionalString,
	getRecord,
	getString,
	isRecord,
	ok,
	responseError,
} from "../shared";
import type { Ha2haResult, Ha2haTransport } from "../types";

const TRAILING_SLASH_PATTERN = /\/$/u;

export interface CreateHttpTransportOptions {
	authorizeRequest?: (request: {
		init: RequestInit;
		url: string;
	}) => Promise<RequestInit | undefined> | RequestInit | undefined;
	baseUrl: string;
	fetch?: typeof fetch;
	workspaceId: string;
}

export const createHttpTransport = ({
	authorizeRequest,
	baseUrl,
	fetch: fetchImpl = fetch,
	workspaceId,
}: CreateHttpTransportOptions): Ha2haTransport => {
	const target = baseUrl.replace(TRAILING_SLASH_PATTERN, "");

	const request = async (
		url: string,
		init: RequestInit = {}
	): Promise<Response> => {
		const nextInit = authorizeRequest
			? ((await authorizeRequest({ init, url })) ?? init)
			: init;
		return fetchImpl(url, nextInit);
	};

	const readJson = async (response: Response): Promise<unknown> => {
		const text = await response.text();
		return text.length > 0 ? JSON.parse(text) : {};
	};

	const parseConflict = async (
		response: Response
	): Promise<Ha2haResult<never>> => {
		const body = await readJson(response);
		const result = ha2haConflictResponseSchema.safeParse(body);
		if (!result.success) {
			return err(
				"version_conflict",
				"Received an invalid HA2HA version conflict response.",
				{ status: response.status }
			);
		}
		return err("version_conflict", result.data.message, {
			latest: result.data.latest,
			status: response.status,
		});
	};

	return {
		deleteFile: async ({ actor, baseVersion, path: filePath }) => {
			const url = `${target}/api/workspaces/${encodeURIComponent(
				workspaceId
			)}/files?path=${encodeURIComponent(filePath)}`;
			const response = await request(url, {
				body: JSON.stringify({ actor, baseVersion }),
				headers: { "Content-Type": "application/json" },
				method: "DELETE",
			});
			if (response.status === 409) {
				return parseConflict(response);
			}
			if (!response.ok) {
				return responseError(response, "delete file");
			}
			const body = await readJson(response);
			return ok({
				deleted: true,
				deletedBy: getOptionalString(body, "deletedBy"),
				path: getString(body, "path", filePath),
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
		listWorkspace: async () => {
			const response = await request(
				`${target}/api/workspaces/${encodeURIComponent(workspaceId)}/tree`
			);
			if (!response.ok) {
				return responseError(response, "list workspace");
			}
			const body = await readJson(response);
			const record = getRecord(body);
			const rawFiles = record.files;
			const files = Array.isArray(rawFiles)
				? rawFiles
						.filter(isRecord)
						.map((file) => ({
							path: getString(file, "path", ""),
							version: getOptionalNumber(file, "version"),
						}))
						.filter((file) => file.path.length > 0)
				: [];
			return ok({
				files,
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
		readFile: async (filePath) => {
			const response = await request(
				`${target}/api/workspaces/${encodeURIComponent(
					workspaceId
				)}/files?path=${encodeURIComponent(filePath)}`
			);
			if (!response.ok) {
				return responseError(response, "read file");
			}
			const body = await readJson(response);
			return ok({
				content: getString(body, "content", ""),
				contentType: getString(body, "contentType", DEFAULT_CONTENT_TYPE),
				path: getString(body, "path", filePath),
				updatedBy: getOptionalString(body, "updatedBy"),
				version: getNumber(body, "version", 1),
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
		writeFile: async ({
			actor,
			baseVersion,
			content,
			contentType,
			path: filePath,
		}) => {
			const response = await request(
				`${target}/api/workspaces/${encodeURIComponent(workspaceId)}/files`,
				{
					body: JSON.stringify({
						actor,
						baseVersion,
						content,
						contentType: contentType ?? contentTypeForPath(filePath),
						path: filePath,
					}),
					headers: { "Content-Type": "application/json" },
					method: "PUT",
				}
			);
			if (response.status === 409) {
				return parseConflict(response);
			}
			if (!response.ok) {
				return responseError(response, "write file");
			}
			const body = await readJson(response);
			return ok({
				path: getString(body, "path", filePath),
				updatedBy: getOptionalString(body, "updatedBy"),
				version: getNumber(body, "version", 1),
				workspaceId: getString(body, "workspaceId", workspaceId),
			});
		},
	};
};
