import {
	historicalWorkspaceFileResponseSchema,
	type ImportedWorkspaceResponse,
	importedWorkspaceResponseSchema,
	type WorkspaceActivityResponse,
	type WorkspaceAdminStats,
	type WorkspaceCapabilitiesResponse,
	type WorkspaceCommentsResponse,
	type WorkspaceExportBundle,
	type WorkspaceFileResponse,
	type WorkspaceFileVersionsResponse,
	type WorkspaceOverviewResponse,
	type WorkspaceRetentionPolicyResponse,
	workspaceActivityResponseSchema,
	workspaceAdminStatsSchema,
	workspaceCapabilitiesResponseSchema,
	workspaceCommentsResponseSchema,
	workspaceExportBundleSchema,
	workspaceFileResponseSchema,
	workspaceFileVersionsResponseSchema,
	workspaceOverviewResponseSchema,
	workspaceRetentionPolicyResponseSchema,
} from "@mdsync/contracts/workspaces";
import type { z } from "zod";

interface WorkspaceRequestInput {
	apiBaseUrl: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}

interface WorkspaceFileRequestInput extends WorkspaceRequestInput {
	path: string;
}

export function loadWorkspaceFile({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceFileRequestInput): Promise<WorkspaceFileResponse> {
	return requestWorkspaceJson({
		schema: workspaceFileResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/files${fileQuery(path, tokenQuery)}`,
	});
}

export function loadWorkspaceActivityPayload({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceRequestInput): Promise<WorkspaceActivityResponse> {
	return requestWorkspaceJson({
		schema: workspaceActivityResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/activity${tokenQuery}`,
	});
}

export function loadWorkspaceOverview({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceRequestInput): Promise<WorkspaceOverviewResponse> {
	return requestWorkspaceJson({
		schema: workspaceOverviewResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/overview${tokenQuery}`,
	});
}

export function loadWorkspaceCommentsPayload({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceFileRequestInput): Promise<WorkspaceCommentsResponse> {
	return requestWorkspaceJson({
		schema: workspaceCommentsResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/comments${fileQuery(path, tokenQuery)}`,
	});
}

export function loadWorkspaceAdminStats({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceRequestInput): Promise<WorkspaceAdminStats> {
	return requestWorkspaceJson({
		schema: workspaceAdminStatsSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/admin/stats${tokenQuery}`,
	});
}

export function loadWorkspaceCapabilities({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceRequestInput): Promise<WorkspaceCapabilitiesResponse> {
	return requestWorkspaceJson({
		schema: workspaceCapabilitiesResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/capabilities${tokenQuery}`,
	});
}

export function loadWorkspaceExport({
	apiBaseUrl,
	tokenQuery,
	workspaceId,
}: Omit<WorkspaceRequestInput, "signal">): Promise<WorkspaceExportBundle> {
	return requestWorkspaceJson({
		schema: workspaceExportBundleSchema,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/export${tokenQuery}`,
	});
}

export function importWorkspaceExport({
	apiBaseUrl,
	bundle,
}: {
	apiBaseUrl: string;
	bundle: unknown;
}): Promise<ImportedWorkspaceResponse> {
	return requestWorkspaceJson({
		init: {
			body: JSON.stringify(bundle),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		},
		schema: importedWorkspaceResponseSchema,
		url: `${apiBaseUrl}/api/workspaces/import`,
	});
}

export function loadWorkspaceRetentionPolicy({
	apiBaseUrl,
	tokenQuery,
	workspaceId,
}: Omit<
	WorkspaceRequestInput,
	"signal"
>): Promise<WorkspaceRetentionPolicyResponse> {
	return requestWorkspaceJson({
		schema: workspaceRetentionPolicyResponseSchema,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/retention${tokenQuery}`,
	});
}

export function loadWorkspaceFileVersions({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	workspaceId,
}: WorkspaceFileRequestInput): Promise<WorkspaceFileVersionsResponse> {
	return requestWorkspaceJson({
		schema: workspaceFileVersionsResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/files/versions${fileQuery(path, tokenQuery)}`,
	});
}

export function loadHistoricalWorkspaceFile({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	version,
	workspaceId,
}: WorkspaceFileRequestInput & {
	version: number;
}) {
	return requestWorkspaceJson({
		schema: historicalWorkspaceFileResponseSchema,
		signal,
		url: `${apiBaseUrl}/api/workspaces/${workspaceId}/files/versions/${version}${fileQuery(path, tokenQuery)}`,
	});
}

export async function responseMessage(response: Response) {
	try {
		const payload = (await response.json()) as {
			error?: string;
			message?: string;
		};
		return payload.message ?? payload.error ?? response.statusText;
	} catch {
		return response.statusText;
	}
}

async function requestWorkspaceJson<Schema extends z.ZodType>({
	init,
	schema,
	signal,
	url,
}: {
	init?: RequestInit;
	schema: Schema;
	signal?: AbortSignal;
	url: string;
}): Promise<z.infer<Schema>> {
	const response = await fetch(url, { ...init, signal });

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return schema.parse(await response.json());
}

function fileQuery(path: string, tokenQuery: string) {
	const prefix = tokenQuery ? `${tokenQuery}&` : "?";
	return `${prefix}path=${encodeURIComponent(path)}`;
}
