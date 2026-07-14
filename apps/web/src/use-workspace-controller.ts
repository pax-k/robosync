import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	loadHistoricalWorkspaceFile,
	loadWorkspaceFile,
	responseMessage,
} from "./api/workspaces";
import type { MarkdownEditorError } from "./components/markdown-editor";
import { useConfirmation } from "./confirmation";
import { useWorkspaceAdmin } from "./use-workspace-admin";
import { useWorkspaceComments } from "./use-workspace-comments";
import { useWorkspaceLoaders } from "./use-workspace-loaders";
import {
	deleteWorkspaceDraft,
	getWorkspaceDraft,
	listWorkspaceDraftPaths,
	putWorkspaceDraft,
} from "./workspace-drafts";
import { writeWorkspaceFile } from "./workspace-mutations";
import {
	type ActivityFilters,
	buildLineDiff,
	filterWorkspaceEvents,
	groupActivityByDay,
	resolveConflictState,
	uniqueEventTypes,
	type WorkspaceEvent,
} from "./workspace-product";
import type {
	HistoricalWorkspaceFilePayload,
	ViewMode,
	WorkspaceComment,
	WorkspaceConflict,
	WorkspaceDraftRecovery,
	WorkspaceFile,
	WorkspaceFilePayload,
	WorkspaceFileVersionMetadata,
	WorkspaceMetadata,
	WorkspaceOverview,
} from "./workspace-types";
import {
	capabilityQuery,
	DEFAULT_ACTIVITY_FILTERS,
	encodePathSegments,
	getSearchParam,
	resolveApiBaseUrl,
} from "./workspace-utils";

export function useWorkspaceController({
	workspaceId,
}: {
	workspaceId: string;
}) {
	const confirm = useConfirmation();
	const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);
	const [editToken, setEditToken] = useState(() => getSearchParam("edit"));
	const [readToken] = useState(() => getSearchParam("k"));
	const tokenQuery = useMemo(
		() => capabilityQuery({ editToken, readToken }),
		[editToken, readToken]
	);
	const canEdit = Boolean(editToken);
	const [workspace, setWorkspace] = useState<WorkspaceMetadata | null>(null);
	const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
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
	const [draftPaths, setDraftPaths] = useState<string[]>([]);
	const [conflict, setConflict] = useState<WorkspaceConflict | null>(null);
	const [draftRecovery, setDraftRecovery] =
		useState<WorkspaceDraftRecovery | null>(null);
	const [mode, setMode] = useState<ViewMode>("preview");
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

	const { loadComments, loadFileHistory, loadOverview, loadWorkspaceActivity } =
		useWorkspaceLoaders({
			apiBaseUrl,
			setComments,
			setEvents,
			setFileVersions,
			setOverview,
			setSelectedHistoryVersion,
			tokenQuery,
			workspaceId,
		});
	const { createComment, resolveComment } = useWorkspaceComments({
		apiBaseUrl,
		commentDraft,
		commentLine,
		editToken,
		file,
		loadOverview,
		loadWorkspaceActivity,
		setBusy,
		setCommentDraft,
		setCommentLine,
		setComments,
		setError,
		workspaceId,
	});

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
				loadWorkspaceActivity(),
				loadOverview(),
				listWorkspaceDraftPaths(workspaceId).then(setDraftPaths),
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
		loadOverview,
		loadWorkspaceActivity,
		tokenQuery,
		workspaceId,
	]);

	useEffect(() => {
		loadWorkspace();
	}, [loadWorkspace]);

	const loadSelectedFile = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Abort-safe file and draft recovery are one atomic load transition.
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
					const storedDraft = await getWorkspaceDraft(workspaceId, path);
					if (signal?.aborted) {
						return;
					}
					setFile(payload);
					setConflict(null);
					if (storedDraft?.baseVersion === payload.version) {
						setDraft(storedDraft.content);
						setDraftRecovery(null);
					} else {
						setDraft(payload.content);
						setDraftRecovery(
							storedDraft
								? {
										draft: storedDraft.content,
										draftBaseVersion: storedDraft.baseVersion,
										remote: payload,
									}
								: null
						);
					}
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
		if (!(file && draft !== file.content)) {
			return;
		}
		const timer = window.setTimeout(() => {
			putWorkspaceDraft({
				baseVersion: file.version,
				content: draft,
				path: file.path,
				updatedAt: new Date().toISOString(),
				workspaceId,
			})
				.then(() => {
					setDraftPaths((paths) =>
						paths.includes(file.path) ? paths : [...paths, file.path]
					);
				})
				.catch(() => undefined);
		}, 500);
		return () => window.clearTimeout(timer);
	}, [draft, file, workspaceId]);

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
			const result = await writeWorkspaceFile({
				apiBaseUrl,
				content: draft,
				contentType: file.contentType,
				editToken,
				path: file.path,
				version: file.version,
				workspaceId,
			});

			if (result.kind === "conflict") {
				if (result.payload.latest) {
					setFile(result.payload.latest);
					setConflict({
						localContent: draft,
						path: file.path,
						remote: result.payload.latest,
					});
				}
				setError(
					"This file changed elsewhere. Reconcile both versions before saving."
				);
				return;
			}

			const { payload } = result;

			setFile({
				...file,
				content: draft,
				updatedAt: payload.updatedAt,
				updatedBy: payload.updatedBy,
				version: payload.version,
			});
			setDraft(draft);
			setConflict(null);
			setDraftRecovery(null);
			await deleteWorkspaceDraft(workspaceId, payload.path);
			setDraftPaths((paths) => paths.filter((path) => path !== payload.path));
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
			await Promise.all([
				loadWorkspaceActivity(),
				loadFileHistory(payload.path),
			]);
			await loadComments(payload.path);
			setMode("preview");
			toast.success(`Saved as version ${payload.version}.`);
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
		loadWorkspaceActivity,
		workspaceId,
	]);

	const cancelEditing = useCallback(async () => {
		if (!file) {
			setMode("preview");
			return;
		}
		const hasChanges = draft !== file.content;
		if (
			hasChanges &&
			!(await confirm({
				confirmLabel: "Discard draft",
				description: "Your unsaved local changes cannot be recovered.",
				destructive: true,
				title: "Discard this local draft?",
			}))
		) {
			return;
		}
		setDraft(file.content);
		setConflict(null);
		setDraftRecovery(null);
		setMode("preview");
		if (hasChanges) {
			deleteWorkspaceDraft(workspaceId, file.path).catch(() => undefined);
			setDraftPaths((paths) => paths.filter((path) => path !== file.path));
		}
	}, [confirm, draft, file, workspaceId]);

	const enterEditing = useCallback(() => {
		if (canEdit && file) {
			setMode("edit");
		}
	}, [canEdit, file]);

	const useLatestConflict = useCallback(async () => {
		if (!conflict) {
			return;
		}
		const confirmed = await confirm({
			confirmLabel: "Use latest",
			description:
				"Your local draft will be discarded and cannot be recovered.",
			destructive: true,
			title: "Use the latest saved version?",
		});
		if (!confirmed) {
			return;
		}
		const resolution = resolveConflictState({
			choice: "use-latest",
			localContent: conflict.localContent,
			remoteContent: conflict.remote.content,
			remoteVersion: conflict.remote.version,
		});
		setDraft(resolution.content);
		setFile(conflict.remote);
		setConflict(null);
		setMode(resolution.mode);
		deleteWorkspaceDraft(workspaceId, conflict.path).catch(() => undefined);
		setDraftPaths((paths) => paths.filter((path) => path !== conflict.path));
	}, [confirm, conflict, workspaceId]);

	const editMergedConflict = useCallback(() => {
		if (!conflict) {
			return;
		}
		const resolution = resolveConflictState({
			choice: "edit-merged",
			localContent: conflict.localContent,
			remoteContent: conflict.remote.content,
			remoteVersion: conflict.remote.version,
		});
		setDraft(resolution.content);
		setFile(conflict.remote);
		setConflict(null);
		setMode(resolution.mode);
	}, [conflict]);

	const copyLocalConflict = useCallback(async () => {
		if (!conflict) {
			return;
		}
		await navigator.clipboard.writeText(conflict.localContent);
		toast.success("Local draft copied.");
	}, [conflict]);

	const restoreRecoveredDraft = useCallback(() => {
		if (!draftRecovery) {
			return;
		}
		setDraft(draftRecovery.draft);
		setFile(draftRecovery.remote);
		setDraftRecovery(null);
		setMode("edit");
	}, [draftRecovery]);

	const discardRecoveredDraft = useCallback(async () => {
		if (!draftRecovery) {
			return;
		}
		const confirmed = await confirm({
			confirmLabel: "Discard older draft",
			description: "The older local draft cannot be recovered after this step.",
			destructive: true,
			title: "Keep the latest saved version?",
		});
		if (!confirmed) {
			return;
		}
		setDraft(draftRecovery.remote.content);
		setDraftRecovery(null);
		deleteWorkspaceDraft(workspaceId, draftRecovery.remote.path).catch(
			() => undefined
		);
		setDraftPaths((paths) =>
			paths.filter((path) => path !== draftRecovery.remote.path)
		);
	}, [confirm, draftRecovery, workspaceId]);

	const restoreHistoricalVersion = useCallback(async () => {
		if (!(editToken && file && historicalFile)) {
			return;
		}
		const confirmed = await confirm({
			confirmLabel: `Restore version ${historicalFile.version}`,
			description: "The selected content will become a new current version.",
			title: `Restore version ${historicalFile.version}?`,
		});
		if (!confirmed) {
			return;
		}

		setBusy(true);
		setError(null);

		try {
			const result = await writeWorkspaceFile({
				apiBaseUrl,
				content: historicalFile.content,
				contentType: historicalFile.contentType,
				editToken,
				path: file.path,
				version: file.version,
				workspaceId,
			});

			if (result.kind === "conflict") {
				if (result.payload.latest) {
					setFile(result.payload.latest);
					setConflict({
						localContent: historicalFile.content,
						path: file.path,
						remote: result.payload.latest,
					});
				}
				setError(
					"The file changed before restore. Reconcile both versions first."
				);
				return;
			}

			const { payload } = result;

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
			await Promise.all([
				loadWorkspaceActivity(),
				loadFileHistory(payload.path),
			]);
			await loadComments(payload.path);
			setMode("preview");
			toast.success(`Restored as version ${payload.version}.`);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Restore failed.");
		} finally {
			setBusy(false);
		}
	}, [
		apiBaseUrl,
		confirm,
		editToken,
		file,
		historicalFile,
		loadComments,
		loadFileHistory,
		loadWorkspaceActivity,
		workspaceId,
	]);

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
					loadOverview(),
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
		loadOverview,
		loadSelectedFile,
		loadWorkspace,
		mode,
		selectedPath,
	]);
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
		cancelEditing,
		canEdit,
		capabilities,
		capabilityLinks,
		capabilityNotice,
		commentDraft,
		commentLine,
		comments,
		conflict,
		copyLocalConflict,
		createComment,
		diffLines,
		discardRecoveredDraft,
		draft,
		draftPaths,
		draftRecovery,
		editMergedConflict,
		editorRevisionKey,
		enterEditing,
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
		overview,
		rawUrl,
		resolveComment,
		restoreHistoricalVersion,
		restoreRecoveredDraft,
		retentionPolicy,
		revokeCapability,
		rotateCapability,
		saveFile,
		selectedHistoryVersion,
		selectedPath,
		setActivityFilters,
		setCommentDraft,
		setCommentLine,
		setSelectedHistoryVersion,
		setSelectedPath,
		useLatestConflict,
		workspace,
	};
}
