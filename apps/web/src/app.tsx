import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import { Label } from "@mdsync/ui/components/label";
import { Textarea } from "@mdsync/ui/components/textarea";
import { ExternalLink, FileText, FolderTree } from "lucide-react";
import {
	type ChangeEvent,
	lazy,
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	importWorkspaceExport,
	loadHistoricalWorkspaceFile,
	loadWorkspaceAdminStats,
	loadWorkspaceCapabilities,
	loadWorkspaceCommentsPayload,
	loadWorkspaceEventsPayload,
	loadWorkspaceExport,
	loadWorkspaceFile,
	loadWorkspaceFileVersions,
	loadWorkspaceRetentionPolicy,
	responseMessage,
} from "./api/workspaces";
import type { MarkdownEditorError } from "./components/markdown-editor";
import { MarkdownPreview } from "./components/markdown-preview";
import {
	ActivityPanel,
	AdminPanel,
	CommentsPanel,
	DocumentToolbar,
	FileListItem,
	HistoryPanel,
} from "./workspace-components";
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
	CapabilityKind,
	CapabilityLinks,
	CapabilityMutationPayload,
	CreateWorkspaceResponse,
	HistoricalWorkspaceFilePayload,
	VersionConflictResponse,
	ViewMode,
	WorkspaceAdminStats,
	WorkspaceCapabilities,
	WorkspaceComment,
	WorkspaceFile,
	WorkspaceFilePayload,
	WorkspaceFileVersionMetadata,
	WorkspaceMetadata,
	WorkspaceRetentionPolicy,
} from "./workspace-types";
import {
	capabilityQuery,
	DEFAULT_ACTIVITY_FILTERS,
	downloadJsonFile,
	encodePathSegments,
	getSearchParam,
	getWorkspaceIdFromPath,
	PRODUCT_ACTOR,
	replaceWorkspaceUrl,
	resolveApiBaseUrl,
} from "./workspace-utils";

const MarkdownEditor = lazy(async () => {
	const prismModule = await import("prismjs");
	(globalThis as { Prism?: unknown }).Prism =
		prismModule.default ?? prismModule;

	const module = await import("./components/markdown-editor");

	return { default: module.MarkdownEditor };
});

const DEFAULT_PATH = "README.md";
const DEFAULT_CONTENT = "# MDSync workspace\n\nStart writing here.\n";

export function App() {
	const workspaceId = getWorkspaceIdFromPath();

	if (!workspaceId) {
		return <CreateWorkspaceView />;
	}

	return <WorkspaceView workspaceId={workspaceId} />;
}

function CreateWorkspaceView() {
	const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);
	const [title, setTitle] = useState("New workspace");
	const [path, setPath] = useState(DEFAULT_PATH);
	const [content, setContent] = useState(DEFAULT_CONTENT);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleTitleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setTitle(event.target.value);
		},
		[]
	);
	const handlePathChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setPath(event.target.value);
		},
		[]
	);
	const handleContentChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setContent(event.target.value);
		},
		[]
	);

	const createWorkspace = useCallback(async () => {
		setBusy(true);
		setError(null);

		try {
			const response = await fetch(`${apiBaseUrl}/api/workspaces`, {
				body: JSON.stringify({
					files: [{ content, path }],
					readAccess: "token",
					title,
					writeAccess: "token",
				}),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});

			const payload = (await response.json()) as CreateWorkspaceResponse & {
				error?: string;
				message?: string;
			};

			if (!response.ok) {
				throw new Error(payload.message ?? payload.error ?? "Create failed.");
			}

			window.location.href = payload.editUrl ?? payload.workspaceUrl;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Create failed.");
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, content, path, title]);

	return (
		<main className="create-screen">
			<section className="create-shell">
				<header className="topbar">
					<div>
						<p className="eyebrow">MDSync</p>
						<h1>Workspace</h1>
					</div>
					<a
						className="icon-link"
						href={apiBaseUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						<ExternalLink aria-hidden="true" size={18} />
						<span>{new URL(apiBaseUrl).host}</span>
					</a>
				</header>

				<div className="create-form">
					<Label className="field-label">
						<span>Title</span>
						<Input
							className="create-input"
							onChange={handleTitleChange}
							value={title}
						/>
					</Label>
					<Label className="field-label">
						<span>Path</span>
						<Input
							className="create-input"
							onChange={handlePathChange}
							value={path}
						/>
					</Label>
					<Label className="field-label content-field">
						<span>Markdown</span>
						<Textarea
							className="source-textarea"
							onChange={handleContentChange}
							value={content}
						/>
					</Label>
					<div className="action-row">
						<Button disabled={busy} onClick={createWorkspace} type="button">
							<FileText aria-hidden="true" size={17} />
							<span>{busy ? "Creating" : "Create"}</span>
						</Button>
					</div>
					{error ? <p className="error-text">{error}</p> : null}
				</div>
			</section>
		</main>
	);
}

function WorkspaceView({ workspaceId }: { workspaceId: string }) {
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
	const [adminStats, setAdminStats] = useState<WorkspaceAdminStats | null>(
		null
	);
	const [capabilities, setCapabilities] =
		useState<WorkspaceCapabilities | null>(null);
	const [capabilityLinks, setCapabilityLinks] = useState<CapabilityLinks>({});
	const [capabilityNotice, setCapabilityNotice] = useState<string | null>(null);
	const [adminActionNotice, setAdminActionNotice] = useState<string | null>(
		null
	);
	const [importedWorkspaceLinks, setImportedWorkspaceLinks] =
		useState<CapabilityLinks>({});
	const [retentionPolicy, setRetentionPolicy] =
		useState<WorkspaceRetentionPolicy | null>(null);
	const [draft, setDraft] = useState("");
	const [mode, setMode] = useState<ViewMode>(canEdit ? "edit" : "preview");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	const loadCapabilities = useCallback(
		async (signal?: AbortSignal) => {
			if (!editToken) {
				setCapabilities(null);
				return;
			}

			const payload = await loadWorkspaceCapabilities({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setCapabilities(payload.capabilities);
			}
		},
		[apiBaseUrl, editToken, tokenQuery, workspaceId]
	);

	const loadAdminStats = useCallback(
		async (signal?: AbortSignal) => {
			if (!editToken) {
				setAdminStats(null);
				return;
			}

			const stats = await loadWorkspaceAdminStats({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setAdminStats(stats);
			}
		},
		[apiBaseUrl, editToken, tokenQuery, workspaceId]
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

	const rotateCapability = useCallback(
		async (capability: CapabilityKind) => {
			if (!editToken) {
				return;
			}

			setBusy(true);
			setError(null);
			setCapabilityNotice(null);

			try {
				const response = await fetch(
					`${apiBaseUrl}/api/workspaces/${workspaceId}/capabilities/${capability}/rotate`,
					{
						headers: {
							Authorization: `Bearer ${editToken}`,
						},
						method: "POST",
					}
				);

				if (!response.ok) {
					throw new Error(await responseMessage(response));
				}

				const payload = (await response.json()) as CapabilityMutationPayload;
				setCapabilities(payload.capabilities);
				setCapabilityLinks(payload.links ?? {});
				if (capability === "edit" && payload.links?.editUrl) {
					const nextEditToken = new URL(payload.links.editUrl).searchParams.get(
						"edit"
					);
					if (nextEditToken) {
						setEditToken(nextEditToken);
						replaceWorkspaceUrl({ editToken: nextEditToken, workspaceId });
					}
				}
				setCapabilityNotice(
					capability === "read"
						? "Read link rotated."
						: "Edit link rotated and this session was updated."
				);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Rotation failed.");
			} finally {
				setBusy(false);
			}
		},
		[apiBaseUrl, editToken, workspaceId]
	);

	const revokeCapability = useCallback(
		async (capability: CapabilityKind) => {
			if (!editToken) {
				return;
			}

			setBusy(true);
			setError(null);
			setCapabilityNotice(null);

			try {
				const response = await fetch(
					`${apiBaseUrl}/api/workspaces/${workspaceId}/capabilities/${capability}/revoke`,
					{
						headers: {
							Authorization: `Bearer ${editToken}`,
						},
						method: "POST",
					}
				);

				if (!response.ok) {
					throw new Error(await responseMessage(response));
				}

				const payload = (await response.json()) as CapabilityMutationPayload;
				setCapabilities(payload.capabilities);
				setCapabilityLinks({});
				setCapabilityNotice(
					capability === "read"
						? "Read link revoked."
						: "Edit link revoked for this workspace."
				);
				if (capability === "edit") {
					setEditToken(null);
					replaceWorkspaceUrl({ editToken: null, workspaceId });
					setMode("preview");
				}
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Revocation failed.");
			} finally {
				setBusy(false);
			}
		},
		[apiBaseUrl, editToken, workspaceId]
	);

	const exportWorkspace = useCallback(async () => {
		if (!editToken) {
			return;
		}

		setBusy(true);
		setError(null);
		setAdminActionNotice(null);

		try {
			const bundle = await loadWorkspaceExport({
				apiBaseUrl,
				tokenQuery,
				workspaceId,
			});
			downloadJsonFile(bundle, `${workspaceId}-workspace-export.json`);
			setAdminActionNotice("Workspace export downloaded.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Export failed.");
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, editToken, tokenQuery, workspaceId]);

	const importWorkspace = useCallback(
		async (sourceFile: File) => {
			setBusy(true);
			setError(null);
			setAdminActionNotice(null);
			setImportedWorkspaceLinks({});

			try {
				const bundle = JSON.parse(await sourceFile.text()) as unknown;
				const imported = await importWorkspaceExport({
					apiBaseUrl,
					bundle,
				});
				setImportedWorkspaceLinks({
					editUrl: imported.editUrl,
					rawUrl: imported.rawUrl,
					workspaceUrl: imported.workspaceUrl,
				});
				setAdminActionNotice(
					`Workspace import created with ${imported.importedCounts.files} files.`
				);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Import failed.");
			} finally {
				setBusy(false);
			}
		},
		[apiBaseUrl]
	);

	const loadRetentionPolicy = useCallback(async () => {
		if (!editToken) {
			return;
		}

		setBusy(true);
		setError(null);
		setAdminActionNotice(null);

		try {
			const policy = await loadWorkspaceRetentionPolicy({
				apiBaseUrl,
				tokenQuery,
				workspaceId,
			});
			setRetentionPolicy(policy);
			setAdminActionNotice("Retention policy loaded.");
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Retention policy failed."
			);
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, editToken, tokenQuery, workspaceId]);

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
	let documentSurface: ReactNode = (
		<MarkdownPreview markdown={file?.content ?? ""} />
	);

	if (mode === "activity") {
		documentSurface = (
			<ActivityPanel
				eventTypes={activityTypes}
				files={files}
				filters={activityFilters}
				groups={activityGroups}
				onFiltersChange={setActivityFilters}
				onSelectPath={selectActivityPath}
			/>
		);
	} else if (mode === "admin") {
		documentSurface = (
			<AdminPanel
				adminActionNotice={adminActionNotice}
				busy={busy}
				canEdit={canEdit}
				capabilities={capabilities}
				capabilityLinks={capabilityLinks}
				capabilityNotice={capabilityNotice}
				importedWorkspaceLinks={importedWorkspaceLinks}
				onExportWorkspace={exportWorkspace}
				onImportWorkspace={importWorkspace}
				onLoadRetentionPolicy={loadRetentionPolicy}
				onRefresh={loadAdminStats}
				onRevokeCapability={revokeCapability}
				onRotateCapability={rotateCapability}
				retentionPolicy={retentionPolicy}
				stats={adminStats}
			/>
		);
	} else if (mode === "history") {
		documentSurface = (
			<HistoryPanel
				canEdit={canEdit}
				diffLines={diffLines}
				file={file}
				historicalFile={historicalFile}
				onRestore={restoreHistoricalVersion}
				onSelectVersion={setSelectedHistoryVersion}
				selectedVersion={selectedHistoryVersion}
				versions={fileVersions}
			/>
		);
	} else if (mode === "comments") {
		documentSurface = (
			<CommentsPanel
				busy={busy}
				canEdit={canEdit}
				commentDraft={commentDraft}
				commentLine={commentLine}
				comments={comments}
				currentVersion={file?.version ?? null}
				file={file}
				onCommentDraftChange={setCommentDraft}
				onCommentLineChange={setCommentLine}
				onCreateComment={createComment}
				onResolveComment={resolveComment}
			/>
		);
	} else if (mode === "edit" && canEdit) {
		documentSurface = (
			<Suspense fallback={<div className="editor-loading">Loading editor</div>}>
				<MarkdownEditor
					baselineMarkdown={file?.content ?? ""}
					markdown={draft}
					onEditorError={handleEditorError}
					onMarkdownChange={handleDraftChange}
					revisionKey={editorRevisionKey}
				/>
			</Suspense>
		);
	}

	return (
		<main className="workspace-screen">
			<aside className="sidebar">
				<div className="brand-row">
					<FolderTree aria-hidden="true" size={20} />
					<span>MDSync</span>
				</div>
				<div className="workspace-title">
					<h1>{workspace?.title ?? workspaceId}</h1>
					<p>{workspaceId}</p>
				</div>
				<nav aria-label="Workspace files" className="file-list">
					{files.map((item) => (
						<FileListItem
							isSelected={item.path === selectedPath}
							item={item}
							key={item.path}
							onSelect={setSelectedPath}
						/>
					))}
				</nav>
			</aside>

			<section className="document-pane">
				<header className="document-toolbar">
					<DocumentToolbar
						busy={busy}
						canEdit={canEdit}
						file={file}
						mode={mode}
						onActivity={showActivity}
						onAdmin={showAdmin}
						onComments={showComments}
						onHistory={showHistory}
						onRefresh={handleRefresh}
						onSave={saveFile}
						onToggleMode={toggleMode}
						rawUrl={rawUrl}
					/>
				</header>

				{error ? <p className="error-banner">{error}</p> : null}

				<div className="document-surface">{documentSurface}</div>
			</section>
		</main>
	);
}
