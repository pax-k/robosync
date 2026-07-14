import { type Dispatch, type SetStateAction, useCallback } from "react";
import {
	loadWorkspaceActivityPayload,
	loadWorkspaceCommentsPayload,
	loadWorkspaceFileVersions,
	loadWorkspaceOverview,
} from "./api/workspaces";
import type { WorkspaceEvent } from "./workspace-product";
import type {
	WorkspaceComment,
	WorkspaceFileVersionMetadata,
	WorkspaceOverview,
} from "./workspace-types";

export function useWorkspaceLoaders({
	apiBaseUrl,
	setComments,
	setEvents,
	setFileVersions,
	setOverview,
	setSelectedHistoryVersion,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	setComments: Dispatch<SetStateAction<WorkspaceComment[]>>;
	setEvents: Dispatch<SetStateAction<WorkspaceEvent[]>>;
	setFileVersions: Dispatch<SetStateAction<WorkspaceFileVersionMetadata[]>>;
	setOverview: Dispatch<SetStateAction<WorkspaceOverview | null>>;
	setSelectedHistoryVersion: Dispatch<SetStateAction<number | null>>;
	tokenQuery: string;
	workspaceId: string;
}) {
	const loadWorkspaceActivity = useCallback(
		async (signal?: AbortSignal) => {
			const payload = await loadWorkspaceActivityPayload({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setEvents(payload.items);
			}
		},
		[apiBaseUrl, setEvents, tokenQuery, workspaceId]
	);

	const loadOverview = useCallback(
		async (signal?: AbortSignal) => {
			const payload = await loadWorkspaceOverview({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setOverview(payload);
			}
		},
		[apiBaseUrl, setOverview, tokenQuery, workspaceId]
	);

	const loadComments = useCallback(
		async (path: string, signal?: AbortSignal) => {
			const payload = await loadWorkspaceCommentsPayload({
				apiBaseUrl,
				path,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setComments(payload.comments);
			}
		},
		[apiBaseUrl, setComments, tokenQuery, workspaceId]
	);

	const loadFileHistory = useCallback(
		async (path: string, signal?: AbortSignal) => {
			const payload = await loadWorkspaceFileVersions({
				apiBaseUrl,
				path,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (signal?.aborted) {
				return;
			}
			setFileVersions(payload.versions);
			setSelectedHistoryVersion((currentVersion) => {
				if (
					currentVersion &&
					payload.versions.some((version) => version.version === currentVersion)
				) {
					return currentVersion;
				}
				return payload.versions.at(-1)?.version ?? null;
			});
		},
		[
			apiBaseUrl,
			setFileVersions,
			setSelectedHistoryVersion,
			tokenQuery,
			workspaceId,
		]
	);

	return { loadComments, loadFileHistory, loadOverview, loadWorkspaceActivity };
}
