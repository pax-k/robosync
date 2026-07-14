import {
	workspaceActivityResponseSchema,
	workspaceCommentsResponseSchema,
	workspaceEventsResponseSchema,
	workspaceFileVersionsResponseSchema,
	workspaceOverviewResponseSchema,
} from "@mdsync/contracts/workspaces";
import { createHostedHa2haClient } from "./ha2ha";
import {
	buildProductLink,
	contentTypeForPath,
	resolveWorkspaceId,
} from "./links";
import {
	parseAdminStats,
	parseCapabilityPayload,
	parseCapabilityRevocationPayload,
	parseCapabilityRotationPayload,
	parseComment,
	parseCreatedWorkspace,
	parseDeleteResult,
	parseExportBundle,
	parseFile,
	parseHistoricalFile,
	parseImportedWorkspace,
	parseRetentionPolicy,
	parseRetentionPruneResult,
	parseWorkspace,
	parseWorkspaceListing,
	parseWriteResult,
} from "./parsers";
import { type RequestInput, requestJson } from "./request";
import type {
	CreateMdsyncClientOptions,
	MdsyncClient,
	MdsyncResult,
} from "./types";

const DEFAULT_ACTOR = "mdsync-client";
const TRAILING_SLASH_PATTERN = /\/$/u;

export const createMdsyncClient = ({
	actor = DEFAULT_ACTOR,
	apiOrigin,
	auth = { kind: "none" },
	fetch: fetchImpl = fetch,
	webOrigin,
	workspaceId,
}: CreateMdsyncClientOptions): MdsyncClient => {
	const origin = apiOrigin.replace(TRAILING_SLASH_PATTERN, "");
	const workspaceOrigin = (webOrigin ?? apiOrigin).replace(
		TRAILING_SLASH_PATTERN,
		""
	);

	const scopedRequest = <Data>({
		body,
		method = "GET",
		parse,
		pathname,
		query,
		requirement = "read",
	}: RequestInput<Data>): Promise<MdsyncResult<Data>> => {
		const resolvedWorkspaceId = resolveWorkspaceId(workspaceId);
		if (!resolvedWorkspaceId.ok) {
			return Promise.resolve(resolvedWorkspaceId);
		}
		return requestJson({
			auth,
			body,
			fetchImpl,
			method,
			origin,
			parse,
			pathname: pathname(resolvedWorkspaceId.data),
			query,
			requirement,
		});
	};

	return {
		createComment: (input) =>
			scopedRequest({
				body: {
					actor: input.actor ?? actor,
					body: input.body,
					path: input.path,
					selector: input.selector,
					version: input.version,
				},
				method: "POST",
				parse: parseComment,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/comments`,
				requirement: "edit",
			}),
		createHa2haClient: (input = {}) => {
			const id = resolveWorkspaceId(input.workspaceId ?? workspaceId);
			if (!id.ok) {
				return id;
			}
			return createHostedHa2haClient({
				actor,
				auth,
				fetchImpl,
				input,
				origin,
				workspaceId: id.data,
			});
		},
		createHa2haWorkspace: (input) =>
			requestJson({
				auth,
				body: {
					...input,
					protocol: { kind: "ha2ha", version: "1.0.0" },
				},
				fetchImpl,
				method: "POST",
				origin,
				parse: parseCreatedWorkspace,
				pathname: "/api/workspaces",
				requirement: "none",
			}),
		createWorkspace: (input) =>
			requestJson({
				auth,
				body: { ...input, actor: input.actor ?? actor },
				fetchImpl,
				method: "POST",
				origin,
				parse: parseCreatedWorkspace,
				pathname: "/api/workspaces",
				requirement: "none",
			}),
		deleteFile: (input) =>
			scopedRequest({
				body: { actor: input.actor ?? actor, baseVersion: input.baseVersion },
				method: "DELETE",
				parse: parseDeleteResult,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/files`,
				query: { path: input.path },
				requirement: "edit",
			}),
		editUrl: (input = {}) =>
			buildProductLink({
				apiOrigin: origin,
				auth,
				input,
				mode: "edit",
				webOrigin: workspaceOrigin,
				workspaceId,
			}),
		exportWorkspace: () =>
			scopedRequest({
				parse: parseExportBundle,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/export`,
				requirement: "edit",
			}),
		getAdminStats: () =>
			scopedRequest({
				parse: parseAdminStats,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/admin/stats`,
				requirement: "edit",
			}),
		getCapabilities: () =>
			scopedRequest({
				parse: parseCapabilityPayload,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/capabilities`,
				requirement: "edit",
			}),
		getOverview: () =>
			scopedRequest({
				parse: (value) => workspaceOverviewResponseSchema.parse(value),
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/overview`,
			}),
		getRetention: () =>
			scopedRequest({
				parse: parseRetentionPolicy,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/retention`,
				requirement: "edit",
			}),
		getWorkspace: () =>
			scopedRequest({
				parse: parseWorkspace,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}`,
			}),
		importWorkspace: (bundle) =>
			requestJson({
				auth,
				body: bundle,
				fetchImpl,
				method: "POST",
				origin,
				parse: parseImportedWorkspace,
				pathname: "/api/workspaces/import",
				requirement: "none",
			}),
		listActivity: () =>
			scopedRequest({
				parse: (value) => workspaceActivityResponseSchema.parse(value),
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/activity`,
			}),
		listComments: (input = {}) =>
			scopedRequest({
				parse: (value) => workspaceCommentsResponseSchema.parse(value),
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/comments`,
				query: input.path ? { path: input.path } : undefined,
			}),
		listEvents: () =>
			scopedRequest({
				parse: (value) => workspaceEventsResponseSchema.parse(value),
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/events`,
			}),
		listFiles: () =>
			scopedRequest({
				parse: parseWorkspaceListing,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/tree`,
			}),
		listFileVersions: (path) =>
			scopedRequest({
				parse: (value) => workspaceFileVersionsResponseSchema.parse(value),
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/files/versions`,
				query: { path },
			}),
		pruneRetention: (input) =>
			scopedRequest({
				body: input,
				method: "POST",
				parse: parseRetentionPruneResult,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/retention/prune`,
				requirement: "edit",
			}),
		rawUrl: (input = {}) =>
			buildProductLink({
				apiOrigin: origin,
				auth,
				input,
				mode: "raw",
				webOrigin: workspaceOrigin,
				workspaceId,
			}),
		readFile: (path) =>
			scopedRequest({
				parse: parseFile,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/files`,
				query: { path },
			}),
		readFileVersion: (input) =>
			scopedRequest({
				parse: parseHistoricalFile,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/files/versions/${input.version}`,
				query: { path: input.path },
			}),
		resolveComment: (input) =>
			scopedRequest({
				body: { actor: input.actor ?? actor },
				method: "POST",
				parse: parseComment,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/comments/${encodeURIComponent(
						input.commentId
					)}/resolve`,
				requirement: "edit",
			}),
		revokeCapability: (capability) =>
			scopedRequest({
				method: "POST",
				parse: parseCapabilityRevocationPayload,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/capabilities/${capability}/revoke`,
				requirement: "edit",
			}),
		rotateCapability: (capability) =>
			scopedRequest({
				method: "POST",
				parse: parseCapabilityRotationPayload,
				pathname: (id) =>
					`/api/workspaces/${encodeURIComponent(id)}/capabilities/${capability}/rotate`,
				requirement: "edit",
			}),
		workspaceUrl: (input = {}) =>
			buildProductLink({
				apiOrigin: origin,
				auth,
				input,
				mode: "workspace",
				webOrigin: workspaceOrigin,
				workspaceId,
			}),
		writeFile: (input) =>
			scopedRequest({
				body: {
					actor: input.actor ?? actor,
					baseVersion: input.baseVersion,
					content: input.content,
					contentType: input.contentType ?? contentTypeForPath(input.path),
					path: input.path,
				},
				method: "PUT",
				parse: parseWriteResult,
				pathname: (id) => `/api/workspaces/${encodeURIComponent(id)}/files`,
				requirement: "edit",
			}),
	};
};
