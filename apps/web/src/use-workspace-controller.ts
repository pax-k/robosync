import { useCallback, useEffect, useMemo, useState } from "react";
import {
	loadHistoricalWorkspaceFile,
	loadWorkspaceCommentsPayload,
	loadWorkspaceEventsPayload,
	loadWorkspaceFile,
	loadWorkspaceFileVersions,
	responseMessage,
} from "./api/workspaces";
import type { MarkdownEditorError } from "./components/markdown-editor";
import { useWorkspaceAdmin } from "./use-workspace-admin";
import {
	type ActivityFilters,
	buildLineDiff,
	createRestoreDraft,
	filterWorkspaceEvents,
	groupActivityByDay,
	uniqueEventTypes,
	type WorkspaceEvent,
} from "./workspace-product";
import type {
	HistoricalWorkspaceFilePayload,
	VersionConflictResponse,
	ViewMode,
	WorkspaceComment,
	WorkspaceFile,
	WorkspaceFilePayload,
	WorkspaceFileVersionMetadata,
	WorkspaceMetadata,
} from "./workspace-types";
import {
	capabilityQuery,
	DEFAULT_ACTIVITY_FILTERS,
	encodePathSegments,
	getSearchParam,
	PRODUCT_ACTOR,
	resolveApiBaseUrl,
} from "./workspace-utils";

export function useWorkspaceController({
	workspaceId,
}: {
	workspaceId: string;
}) {
	const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);
	const [editToken, setEditToken] = useState(() => getSearchParam("edit"));
	const [readToken] = useState(() => getSearchParam("k"));
	const tokenQuery = useMemo(
		() => capabilityQuery({ editToken, readToken }),
		[editToken, readToken]
	);
	const canEdit = Boolean(editToken);
	const [workspace, setWorkspace] = useState<WorkspaceMetadata | null>(null);
	const [files, setFiles] = useState<WorkspaceFile[]>([]);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [file, setFile] = useState<WorkspaceFilePayload | null>(null);
	const [events, setEvents] = useState<WorkspaceEvent[]>([]);
	const [activityFilters, setActivityFilters] = useState<ActivityFilters>({
		...DEFAULT_ACTIVITY_FILTERS,
	});
	const [fileVersions, setFileVersions] = useState<
		WorkspaceFileVersionMetadata[]
	>([]);
	const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<
		number | null
	>(null);
	const [historicalFile, setHistoricalFile] =
		useState<HistoricalWorkspaceFilePayload | null>(null);
	const [comments, setComments] = useState<WorkspaceComment[]>([]);
	const [commentDraft, setCommentDraft] = useState("");
	const [commentLine, setCommentLine] = useState("");
	const [draft, setDraft] = useState("");
	const [mode, setMode] = useState<ViewMode>(canEdit ? "edit" : "preview");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const {
		adminActionNotice,
		adminStats,
		capabilities,
		capabilityLinks,
		capabilityNotice,
		exportWorkspace,
		importedWorkspaceLinks,
		importWorkspace,
		loadAdminStats,
		loadCapabilities,
		loadRetentionPolicy,
		retentionPolicy,
		revokeCapability,
		rotateCapability,
	} = useWorkspaceAdmin({
		apiBaseUrl,
		editToken,
		setBusy,
		setEditToken,
		setError,
		setMode,
		tokenQuery,
		workspaceId,
	});

	const loadWorkspaceEvents = useCallback(
		async (signal?: AbortSignal) => {
			const eventsPayload = await loadWorkspaceEventsPayload({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setEvents(eventsPayload.events);
			}
		},
		[apiBaseUrl, tokenQuery, workspaceId]
	);

	const loadComments = useCallback(
		async (path: string, signal?: AbortSignal) => {
			const commentsPayload = await loadWorkspaceCommentsPayload({
				apiBaseUrl,
				path,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setComments(commentsPayload.comments);
			}
		},
		[apiBaseUrl, tokenQuery, workspaceId]
	);

	const loadFileHistory = useCallback(
		async (path: string, signal?: AbortSignal) => {
			const historyPayload = await loadWorkspaceFileVersions({
				apiBaseUrl,
				path,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (signal?.aborted) {
				return;
			}
			const { versions } = historyPayload;
			setFileVersions(versions);
			setSelectedHistoryVersion((currentVersion) => {
				if (
					currentVersion &&
					versions.some((version) => version.version === currentVersion)
				) {
					return currentVersion;
				}
				return versions.at(-1)?.version ?? null;
			});
		},
		[apiBaseUrl, tokenQuery, workspaceId]
	);

	const loadWorkspace = useCallback(async () => {
		setBusy(true);
		setError(null);

		try {
			const [workspaceResponse, treeResponse] = await Promise.all([
				fetch(`${apiBaseUrl}/api/workspaces/${workspaceId}${tokenQuery}`),
				fetch(`${apiBaseUrl}/api/workspaces/${workspaceId}/tree${tokenQuery}`),
			]);

			if (!workspaceResponse.ok) {
				throw new Error(await responseMessage(workspaceResponse));
			}
			if (!treeResponse.ok) {
				throw new Error(await responseMessage(treeResponse));
			}

			const workspacePayload =
				(await workspaceResponse.json()) as WorkspaceMetadata;
			const treePayload = (await treeResponse.json()) as {
				files: WorkspaceFile[];
			};

			setWorkspace(workspacePayload);
			setFiles(treePayload.files);
			setSelectedPath(
				(currentPath) => currentPath ?? treePayload.files[0]?.path ?? null
			);
			await Promise.all([
				loadWorkspaceEvents(),
				editToken ? loadCapabilities() : Promise.resolve(),
			]);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Workspace load failed."
			);
		} finally {
			setBusy(false);
		}
	}, [
		apiBaseUrl,
		editToken,
		loadCapabilities,
		loadWorkspaceEvents,
		tokenQuery,
		workspaceId,
	]);

	useEffect(() => {
		loadWorkspace();
	}, [loadWorkspace]);

	const loadSelectedFile = useCallback(
		async (path: string, signal?: AbortSignal) => {
			setBusy(true);
			setError(null);

			try {
				const payload = await loadWorkspaceFile({
					apiBaseUrl,
					path,
					signal,
					tokenQuery,
					workspaceId,
				});
				if (!signal?.aborted) {
					setFile(payload);
					setDraft(payload.content);
				}
			} catch (cause) {
				if (!signal?.aborted) {
					setError(
						cause instanceof Error ? cause.message : "File load failed."
					);
				}
			} finally {
				if (!signal?.aborted) {
					setBusy(false);
				}
			}
		},
		[apiBaseUrl, tokenQuery, workspaceId]
	);

	useEffect(() => {
		if (!selectedPath) {
			setFile(null);
			setDraft("");
			setFileVersions([]);
			setHistoricalFile(null);
			setComments([]);
			setSelectedHistoryVersion(null);
			return;
		}

		const controller = new AbortController();
		loadSelectedFile(selectedPath, controller.signal).catch(() => undefined);
		loadFileHistory(selectedPath, controller.signal).catch(() => undefined);
		loadComments(selectedPath, controller.signal).catch(() => undefined);

		return () => controller.abort();
	}, [loadComments, loadFileHistory, loadSelectedFile, selectedPath]);

	const loadSelectedHistoricalFile = useCallback(
		async (path: string, version: number, signal?: AbortSignal) => {
			try {
				const payload = await loadHistoricalWorkspaceFile({
					apiBaseUrl,
					path,
					signal,
					tokenQuery,
					version,
					workspaceId,
				});
				if (!signal?.aborted) {
					setHistoricalFile(payload);
				}
			} catch (cause) {
				if (!signal?.aborted) {
					setError(
						cause instanceof Error
							? cause.message
							: "Historical version load failed."
					);
				}
			}
		},
		[apiBaseUrl, tokenQuery, workspaceId]
	);

	useEffect(() => {
		if (!(selectedPath && selectedHistoryVersion)) {
			setHistoricalFile(null);
			return;
		}

		const controller = new AbortController();
		loadSelectedHistoricalFile(
			selectedPath,
			selectedHistoryVersion,
			controller.signal
		).catch(() => undefined);

		return () => controller.abort();
	}, [loadSelectedHistoricalFile, selectedHistoryVersion, selectedPath]);

	const saveFile = useCallback(async () => {
		if (!(file && editToken)) {
			return;
		}

		setBusy(true);
		setError(null);

		try {
			const response = await fetch(
				`${apiBaseUrl}/api/workspaces/${workspaceId}/files`,
				{
					body: JSON.stringify({
						actor: PRODUCT_ACTOR,
						baseVersion: file.version,
						content: draft,
						contentType: file.contentType,
						path: file.path,
					}),
					headers: {
						Authorization: `Bearer ${editToken}`,
						"Content-Type": "application/json",
					},
					method: "PUT",
				}
			);

			if (response.status === 409) {
				const conflict = (await response.json()) as VersionConflictResponse;
				if (conflict.latest) {
					setFile(conflict.latest);
					setDraft(conflict.latest.content);
				}
				throw new Error("File changed elsewhere. Latest content loaded.");
			}

			if (!response.ok) {
				throw new Error(await responseMessage(response));
			}

			const payload = (await response.json()) as Pick<
				WorkspaceFilePayload,
				"path" | "updatedAt" | "updatedBy" | "version"
			>;

			setFile({
				...file,
				content: draft,
				updatedAt: payload.updatedAt,
				updatedBy: payload.updatedBy,
				version: payload.version,
			});
			setFiles((currentFiles) =>
				currentFiles.map((item) =>
					item.path === payload.path
						? {
								...item,
								updatedAt: payload.updatedAt,
								updatedBy: payload.updatedBy,
								version: payload.version,
							}
						: item
				)
			);
			await Promise.all([loadWorkspaceEvents(), loadFileHistory(payload.path)]);
			await loadComments(payload.path);
			setMode("preview");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Save failed.");
		} finally {
			setBusy(false);
		}
	}, [
		apiBaseUrl,
		draft,
		editToken,
		file,
		loadComments,
		loadFileHistory,
		loadWorkspaceEvents,
		workspaceId,
	]);

	const restoreHistoricalVersion = useCallback(async () => {
		if (!(editToken && file && historicalFile)) {
			return;
		}

		setBusy(true);
		setError(null);

		try {
			const response = await fetch(
				`${apiBaseUrl}/api/workspaces/${workspaceId}/files`,
				{
					body: JSON.stringify(
						createRestoreDraft({
							contentType: historicalFile.contentType,
							currentVersion: file.version,
							historicalContent: historicalFile.content,
							path: file.path,
							restoreActor: PRODUCT_ACTOR,
						})
					),
					headers: {
						Authorization: `Bearer ${editToken}`,
						"Content-Type": "application/json",
					},
					method: "PUT",
				}
			);

			if (response.status === 409) {
				const conflict = (await response.json()) as VersionConflictResponse;
				if (conflict.latest) {
					setFile(conflict.latest);
					setDraft(conflict.latest.content);
				}
				throw new Error("File changed elsewhere. Latest content loaded.");
			}

			if (!response.ok) {
				throw new Error(await responseMessage(response));
			}

			const payload = (await response.json()) as Pick<
				WorkspaceFilePayload,
				"path" | "updatedAt" | "updatedBy" | "version"
			>;

			setFile({
				...file,
				content: historicalFile.content,
				contentType: historicalFile.contentType,
				updatedAt: payload.updatedAt,
				updatedBy: payload.updatedBy,
				version: payload.version,
			});
			setDraft(historicalFile.content);
			setFiles((currentFiles) =>
				currentFiles.map((item) =>
					item.path === payload.path
						? {
								...item,
								updatedAt: payload.updatedAt,
								updatedBy: payload.updatedBy,
								version: payload.version,
							}
						: item
				)
			);
			await Promise.all([loadWorkspaceEvents(), loadFileHistory(payload.path)]);
			await loadComments(payload.path);
			setMode("preview");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Restore failed.");
		} finally {
			setBusy(false);
		}
	}, [
		apiBaseUrl,
		editToken,
		file,
		historicalFile,
		loadComments,
		loadFileHistory,
		loadWorkspaceEvents,
		workspaceId,
	]);

	const createComment = useCallback(async () => {
		const trimmedBody = commentDraft.trim();
		if (!(editToken && file && trimmedBody)) {
			return;
		}

		setBusy(true);
		setError(null);

		try {
			const line = Number(commentLine);
			const selector =
				commentLine.trim() && Number.isInteger(line) && line > 0
					? { line }
					: undefined;
			const response = await fetch(
				`${apiBaseUrl}/api/workspaces/${workspaceId}/comments`,
				{
					body: JSON.stringify({
						actor: PRODUCT_ACTOR,
						body: trimmedBody,
						path: file.path,
						selector,
						version: file.version,
					}),
					headers: {
						Authorization: `Bearer ${editToken}`,
						"Content-Type": "application/json",
					},
					method: "POST",
				}
			);

			if (!response.ok) {
				throw new Error(await responseMessage(response));
			}

			const comment = (await response.json()) as WorkspaceComment;
			setComments((currentComments) => [...currentComments, comment]);
			setCommentDraft("");
			setCommentLine("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Comment failed.");
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, commentDraft, commentLine, editToken, file, workspaceId]);

	const resolveComment = useCallback(
		async (commentId: string) => {
			if (!editToken) {
				return;
			}

			setBusy(true);
			setError(null);

			try {
				const response = await fetch(
					`${apiBaseUrl}/api/workspaces/${workspaceId}/comments/${encodeURIComponent(commentId)}/resolve`,
					{
						body: JSON.stringify({ actor: PRODUCT_ACTOR }),
						headers: {
							Authorization: `Bearer ${editToken}`,
							"Content-Type": "application/json",
						},
						method: "POST",
					}
				);

				if (!response.ok) {
					throw new Error(await responseMessage(response));
				}

				const resolvedComment = (await response.json()) as WorkspaceComment;
				setComments((currentComments) =>
					currentComments.map((comment) =>
						comment.id === resolvedComment.id ? resolvedComment : comment
					)
				);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Resolve failed.");
			} finally {
				setBusy(false);
			}
		},
		[apiBaseUrl, editToken, workspaceId]
	);

	const handleDraftChange = useCallback((nextMarkdown: string) => {
		setDraft(nextMarkdown);
	}, []);
	const handleEditorError = useCallback((payload: MarkdownEditorError) => {
		setError(
			`Markdown editor could not parse this file. Switch to source mode to recover: ${payload.error}`
		);
	}, []);
	const handleRefresh = useCallback(async () => {
		setError(null);
		try {
			await loadWorkspace();
			if (selectedPath) {
				await Promise.all([
					loadSelectedFile(selectedPath),
					loadFileHistory(selectedPath),
					loadComments(selectedPath),
					mode === "admin" && canEdit ? loadAdminStats() : Promise.resolve(),
					canEdit ? loadCapabilities() : Promise.resolve(),
				]);
			}
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Refresh failed.");
		}
	}, [
		canEdit,
		loadAdminStats,
		loadCapabilities,
		loadComments,
		loadFileHistory,
		loadSelectedFile,
		loadWorkspace,
		mode,
		selectedPath,
	]);
	const toggleMode = useCallback(() => {
		setMode((currentMode) => (currentMode === "edit" ? "preview" : "edit"));
	}, []);
	const showActivity = useCallback(() => {
		setMode("activity");
	}, []);
	const showHistory = useCallback(() => {
		setMode("history");
	}, []);
	const showComments = useCallback(() => {
		setMode("comments");
	}, []);
	const showAdmin = useCallback(() => {
		setMode("admin");
		loadAdminStats().catch((cause) => {
			setError(cause instanceof Error ? cause.message : "Admin load failed.");
		});
	}, [loadAdminStats]);
	const selectActivityPath = useCallback((path: string) => {
		setSelectedPath(path);
		setMode("preview");
	}, []);

	const activityTypes = useMemo(() => uniqueEventTypes(events), [events]);
	const filteredActivityEvents = useMemo(
		() =>
			filterWorkspaceEvents({
				events,
				filters: activityFilters,
				now: new Date(),
			}),
		[activityFilters, events]
	);
	const activityGroups = useMemo(
		() => groupActivityByDay(filteredActivityEvents),
		[filteredActivityEvents]
	);
	const diffLines = useMemo(
		() =>
			historicalFile && file
				? buildLineDiff(historicalFile.content, file.content)
				: [],
		[file, historicalFile]
	);

	const rawUrl = file
		? `${apiBaseUrl}/w/${workspaceId}/raw/${encodePathSegments(file.path)}${tokenQuery}`
		: null;
	const editorRevisionKey = file ? `${file.path}:${file.version}` : "empty";

	return {
		activityFilters,
		activityGroups,
		activityTypes,
		adminActionNotice,
		adminStats,
		busy,
		canEdit,
		capabilities,
		capabilityLinks,
		capabilityNotice,
		commentDraft,
		commentLine,
		comments,
		createComment,
		diffLines,
		draft,
		editorRevisionKey,
		error,
		exportWorkspace,
		file,
		files,
		fileVersions,
		handleDraftChange,
		handleEditorError,
		handleRefresh,
		historicalFile,
		importedWorkspaceLinks,
		importWorkspace,
		loadAdminStats,
		loadRetentionPolicy,
		mode,
		rawUrl,
		resolveComment,
		restoreHistoricalVersion,
		retentionPolicy,
		revokeCapability,
		rotateCapability,
		saveFile,
		selectActivityPath,
		selectedHistoryVersion,
		selectedPath,
		setActivityFilters,
		setCommentDraft,
		setCommentLine,
		setSelectedHistoryVersion,
		setSelectedPath,
		showActivity,
		showAdmin,
		showComments,
		showHistory,
		toggleMode,
		workspace,
	};
}
