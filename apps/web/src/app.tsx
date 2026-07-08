import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import { Label } from "@mdsync/ui/components/label";
import { Textarea } from "@mdsync/ui/components/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@mdsync/ui/components/tooltip";
import {
	Activity,
	BarChart3,
	CheckCircle2,
	Clock3,
	Download,
	ExternalLink,
	FileText,
	FolderTree,
	KeyRound,
	MessageSquare,
	RefreshCw,
	RotateCcw,
	Save,
	SquarePen,
	Upload,
} from "lucide-react";
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

import type { MarkdownEditorError } from "./components/markdown-editor";
import { MarkdownPreview } from "./components/markdown-preview";
import {
	type ActivityFilters,
	type ActivityGroup,
	type ActivityTimeFilter,
	buildLineDiff,
	createRestoreDraft,
	type DiffLine,
	filterWorkspaceEvents,
	groupActivityByDay,
	uniqueEventTypes,
	type WorkspaceEvent,
} from "./workspace-product";

const MarkdownEditor = lazy(async () => {
	const prismModule = await import("prismjs");
	(globalThis as { Prism?: unknown }).Prism =
		prismModule.default ?? prismModule;

	const module = await import("./components/markdown-editor");

	return { default: module.MarkdownEditor };
});

type AccessMode = "public" | "token";
type WriteAccessMode = "none" | "public" | "token";
type ViewMode =
	| "activity"
	| "admin"
	| "comments"
	| "edit"
	| "history"
	| "preview";

interface WorkspaceFile {
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
}

interface WorkspaceMetadata {
	createdAt: string;
	id: string;
	readAccess: AccessMode;
	title: string | null;
	updatedAt: string;
	writeAccess: WriteAccessMode;
}

interface WorkspaceFilePayload {
	content: string;
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

interface WorkspaceFileVersionMetadata {
	contentType: string;
	createdAt: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

interface HistoricalWorkspaceFilePayload extends WorkspaceFileVersionMetadata {
	content: string;
}

interface WorkspaceComment {
	anchor: {
		heading?: string;
		line?: number;
	};
	authorId: string | null;
	body: string;
	createdAt: string;
	id: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt: string;
	version: number;
	workspaceId: string;
}

type CapabilityKind = "edit" | "read";

interface WorkspaceCapabilityState {
	access: AccessMode | WriteAccessMode;
	canRevoke: boolean;
	canRotate: boolean;
	tokenActive: boolean;
}

interface WorkspaceCapabilities {
	edit: WorkspaceCapabilityState;
	read: WorkspaceCapabilityState;
}

interface CapabilityLinks {
	editUrl?: string;
	rawUrl?: string;
	workspaceUrl?: string;
}

interface WorkspaceCapabilitiesPayload {
	capabilities: WorkspaceCapabilities;
	workspaceId: string;
}

interface CapabilityMutationPayload extends WorkspaceCapabilitiesPayload {
	capability: CapabilityKind;
	links?: CapabilityLinks;
	revoked?: boolean;
}

interface WorkspaceAdminStats {
	cleanup: {
		failedJobs: number;
		latestFailureAt: string | null;
		orphanedObjects: {
			count: number | null;
			status: "not_scanned";
		};
	};
	comments: {
		resolved: number;
		staleAnchors: number;
		total: number;
		unresolved: number;
	};
	conflicts: {
		recent: WorkspaceAdminEvent[];
		total: number;
	};
	events: {
		byType: WorkspaceNamedCount[];
		recent: WorkspaceProtocolEventSummary[];
		total: number;
	};
	files: {
		currentCount: number;
		latestUpdatedAt: string | null;
		totalSizeBytes: number;
	};
	generatedAt: string;
	health: {
		issues: string[];
		status: "attention" | "healthy";
	};
	retention: {
		coverage: string[];
		status: "not_configured";
	};
	storage: {
		activeBytes: number;
		currentFileRecords: number;
		indexedObjects: number;
		r2Prefix: string;
		versionBytes: number;
		versionRecords: number;
	};
	tasks: {
		byState: WorkspaceNamedCount[];
		files: Array<{
			path: string;
			state: string | null;
			version: number;
		}>;
		missingState: number;
		total: number;
	};
	versions: {
		pathsWithHistory: number;
		totalCount: number;
	};
	workspace: {
		createdAt: string;
		fileCount: number;
		id: string;
		lastAccessedAt: string | null;
		readAccess: AccessMode;
		title: string | null;
		totalSizeBytes: number;
		updatedAt: string;
		writeAccess: WriteAccessMode;
	};
	workspaceId: string;
}

interface WorkspaceExportBundle {
	format: string;
	schemaVersion: number;
	workspace: {
		id: string;
		title: string | null;
	};
}

interface ImportedWorkspacePayload {
	editUrl?: string;
	id: string;
	importedCounts: {
		adminEvents: number;
		comments: number;
		events: number;
		fileVersions: number;
		files: number;
	};
	rawUrl: string;
	sourceWorkspaceId: string;
	workspaceUrl: string;
}

interface WorkspaceRetentionPolicy {
	retention: {
		coverage: string[];
		perWorkspaceD1: {
			status: string;
		};
		status: string;
	};
	workspaceId: string;
}

interface WorkspaceNamedCount {
	count: number;
	name: string;
}

interface WorkspaceAdminEvent {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
}

interface WorkspaceProtocolEventSummary extends WorkspaceAdminEvent {
	version: number | null;
}

interface CreateWorkspaceResponse {
	editUrl?: string;
	id: string;
	rawUrl: string;
	workspaceUrl: string;
}

interface VersionConflictResponse {
	error: "version_conflict";
	latest: WorkspaceFilePayload | null;
	message: string;
}

const DEFAULT_PATH = "README.md";
const DEFAULT_CONTENT = "# MDSync workspace\n\nStart writing here.\n";
const DEFAULT_ACTIVITY_FILTERS = {
	actor: "",
	path: "",
	time: "all",
	type: "",
} as const satisfies ActivityFilters;
const PRODUCT_ACTOR = "web";
const WORKSPACE_PATH_PATTERN = /^\/w\/([^/]+)/;
const TRAILING_SLASH_PATTERN = /\/$/;

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

function FileListItem({
	isSelected,
	item,
	onSelect,
}: {
	isSelected: boolean;
	item: WorkspaceFile;
	onSelect: (path: string) => void;
}) {
	const selectFile = useCallback(() => {
		onSelect(item.path);
	}, [item.path, onSelect]);

	return (
		<Button
			className={isSelected ? "selected" : ""}
			onClick={selectFile}
			type="button"
			variant="ghost"
		>
			<FileText aria-hidden="true" size={16} />
			<span>{item.path}</span>
			<small>v{item.version}</small>
		</Button>
	);
}

function DocumentToolbar({
	busy,
	canEdit,
	file,
	mode,
	onAdmin,
	onActivity,
	onComments,
	onHistory,
	onRefresh,
	onSave,
	onToggleMode,
	rawUrl,
}: {
	busy: boolean;
	canEdit: boolean;
	file: WorkspaceFilePayload | null;
	mode: ViewMode;
	onAdmin: () => void;
	onActivity: () => void;
	onComments: () => void;
	onHistory: () => void;
	onRefresh: () => void;
	onSave: () => void;
	onToggleMode: () => void;
	rawUrl: string | null;
}) {
	const modeLabel = mode === "edit" ? "Preview" : "Edit";
	const contentType = file === null ? "markdown" : file.contentType;
	const filePath = file === null ? "No file" : file.path;

	return (
		<>
			<div>
				<p className="eyebrow">{contentType}</p>
				<h2>{filePath}</h2>
			</div>
			<TooltipProvider>
				<div className="toolbar-actions">
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="Refresh"
									onClick={onRefresh}
									size="icon"
									type="button"
									variant="outline"
								>
									<RefreshCw aria-hidden="true" size={17} />
								</Button>
							}
						/>
						<TooltipContent>Refresh</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="Activity"
									className={mode === "activity" ? "active" : ""}
									onClick={onActivity}
									size="icon"
									type="button"
									variant="outline"
								>
									<Activity aria-hidden="true" size={17} />
								</Button>
							}
						/>
						<TooltipContent>Activity</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="History"
									className={mode === "history" ? "active" : ""}
									onClick={onHistory}
									size="icon"
									type="button"
									variant="outline"
								>
									<Clock3 aria-hidden="true" size={17} />
								</Button>
							}
						/>
						<TooltipContent>History</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="Comments"
									className={mode === "comments" ? "active" : ""}
									onClick={onComments}
									size="icon"
									type="button"
									variant="outline"
								>
									<MessageSquare aria-hidden="true" size={17} />
								</Button>
							}
						/>
						<TooltipContent>Comments</TooltipContent>
					</Tooltip>
					{canEdit ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label="Admin"
										className={mode === "admin" ? "active" : ""}
										onClick={onAdmin}
										size="icon"
										type="button"
										variant="outline"
									>
										<BarChart3 aria-hidden="true" size={17} />
									</Button>
								}
							/>
							<TooltipContent>Admin</TooltipContent>
						</Tooltip>
					) : null}
					{rawUrl ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<a
										aria-label="Raw"
										className="toolbar-link"
										href={rawUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										<ExternalLink aria-hidden="true" size={17} />
									</a>
								}
							/>
							<TooltipContent>Raw</TooltipContent>
						</Tooltip>
					) : null}
					{canEdit ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label={modeLabel}
										className={
											mode === "edit" || mode === "preview" ? "active" : ""
										}
										onClick={onToggleMode}
										size="icon"
										type="button"
										variant="outline"
									>
										<SquarePen aria-hidden="true" size={17} />
									</Button>
								}
							/>
							<TooltipContent>{modeLabel}</TooltipContent>
						</Tooltip>
					) : null}
					{canEdit && mode === "edit" ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label="Save"
										disabled={busy}
										onClick={onSave}
										size="icon"
										type="button"
										variant="outline"
									>
										<Save aria-hidden="true" size={17} />
									</Button>
								}
							/>
							<TooltipContent>Save</TooltipContent>
						</Tooltip>
					) : null}
				</div>
			</TooltipProvider>
		</>
	);
}

function AdminPanel({
	adminActionNotice,
	busy,
	capabilities,
	capabilityLinks,
	capabilityNotice,
	canEdit,
	importedWorkspaceLinks,
	onExportWorkspace,
	onImportWorkspace,
	onLoadRetentionPolicy,
	onRefresh,
	onRevokeCapability,
	onRotateCapability,
	retentionPolicy,
	stats,
}: {
	adminActionNotice: string | null;
	busy: boolean;
	capabilities: WorkspaceCapabilities | null;
	capabilityLinks: CapabilityLinks;
	capabilityNotice: string | null;
	canEdit: boolean;
	importedWorkspaceLinks: CapabilityLinks;
	onExportWorkspace: () => Promise<void>;
	onImportWorkspace: (sourceFile: File) => void;
	onLoadRetentionPolicy: () => Promise<void>;
	onRefresh: () => Promise<void>;
	onRevokeCapability: (capability: CapabilityKind) => void;
	onRotateCapability: (capability: CapabilityKind) => void;
	retentionPolicy: WorkspaceRetentionPolicy | null;
	stats: WorkspaceAdminStats | null;
}) {
	const refresh = useCallback(() => {
		onRefresh().catch(() => undefined);
	}, [onRefresh]);

	if (!canEdit) {
		return (
			<section aria-labelledby="admin-heading" className="product-panel">
				<div className="panel-heading">
					<div>
						<p className="eyebrow">Product admin</p>
						<h3 id="admin-heading">Workspace health</h3>
					</div>
				</div>
				<p className="empty-copy">
					Open this workspace with an edit link to inspect admin stats.
				</p>
			</section>
		);
	}

	if (!stats) {
		return (
			<section aria-labelledby="admin-heading" className="product-panel">
				<div className="panel-heading">
					<div>
						<p className="eyebrow">Product admin</p>
						<h3 id="admin-heading">Workspace health</h3>
					</div>
					<Button onClick={refresh} type="button" variant="outline">
						<RefreshCw aria-hidden="true" size={16} />
						<span>Refresh</span>
					</Button>
				</div>
				<p className="empty-copy">Admin stats are loading.</p>
			</section>
		);
	}

	return (
		<section aria-labelledby="admin-heading" className="product-panel">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">Product admin</p>
					<h3 id="admin-heading">Workspace health</h3>
				</div>
				<Button onClick={refresh} type="button" variant="outline">
					<RefreshCw aria-hidden="true" size={16} />
					<span>Refresh</span>
				</Button>
			</div>
			<div className="admin-health-row">
				<span className={`health-badge ${stats.health.status}`}>
					{stats.health.status === "healthy" ? "Healthy" : "Attention"}
				</span>
				<span>Generated {formatDateTime(stats.generatedAt)}</span>
			</div>
			<div className="admin-stat-grid">
				<AdminMetric
					detail={formatBytes(stats.files.totalSizeBytes)}
					label="Files"
					value={String(stats.files.currentCount)}
				/>
				<AdminMetric
					detail={`${stats.versions.pathsWithHistory} with history`}
					label="Versions"
					value={String(stats.versions.totalCount)}
				/>
				<AdminMetric
					detail={formatCounts(stats.events.byType)}
					label="Events"
					value={String(stats.events.total)}
				/>
				<AdminMetric
					detail="version conflicts"
					label="Conflicts"
					value={String(stats.conflicts.total)}
				/>
				<AdminMetric
					detail={`${stats.comments.unresolved} open`}
					label="Comments"
					value={String(stats.comments.total)}
				/>
				<AdminMetric
					detail={`${stats.tasks.missingState} missing state`}
					label="Tasks"
					value={String(stats.tasks.total)}
				/>
			</div>
			<div className="admin-sections">
				<section className="admin-section">
					<h4>Health issues</h4>
					{stats.health.issues.length === 0 ? (
						<p className="empty-copy">
							No health issues are currently flagged.
						</p>
					) : (
						<ul>
							{stats.health.issues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
					)}
				</section>
				<section className="admin-section">
					<h4>Task state</h4>
					{stats.tasks.files.length === 0 ? (
						<p className="empty-copy">No task files are present.</p>
					) : (
						<ul className="admin-record-list">
							{stats.tasks.files.map((task) => (
								<li key={task.path}>
									<span>{task.path}</span>
									<strong>{task.state ?? "missing state"}</strong>
									<small>v{task.version}</small>
								</li>
							))}
						</ul>
					)}
				</section>
				<section className="admin-section">
					<h4>Storage and retention</h4>
					<dl className="admin-facts">
						<div>
							<dt>R2 prefix</dt>
							<dd>{stats.storage.r2Prefix}</dd>
						</div>
						<div>
							<dt>Indexed objects</dt>
							<dd>{stats.storage.indexedObjects}</dd>
						</div>
						<div>
							<dt>Version bytes</dt>
							<dd>{formatBytes(stats.storage.versionBytes)}</dd>
						</div>
						<div>
							<dt>Retention</dt>
							<dd>{formatStatusLabel(stats.retention.status)}</dd>
						</div>
					</dl>
				</section>
				<section className="admin-section">
					<h4>Cleanup</h4>
					<dl className="admin-facts">
						<div>
							<dt>Failed jobs</dt>
							<dd>{stats.cleanup.failedJobs}</dd>
						</div>
						<div>
							<dt>Latest failure</dt>
							<dd>
								{stats.cleanup.latestFailureAt
									? formatDateTime(stats.cleanup.latestFailureAt)
									: "None"}
							</dd>
						</div>
						<div>
							<dt>Orphan scan</dt>
							<dd>
								{stats.cleanup.orphanedObjects.status === "not_scanned"
									? "Not run"
									: stats.cleanup.orphanedObjects.count}
							</dd>
						</div>
					</dl>
					{stats.cleanup.failedJobs === 0 ? (
						<p className="empty-copy">No cleanup failures recorded.</p>
					) : null}
				</section>
				<AdminImportExportSection
					adminActionNotice={adminActionNotice}
					busy={busy}
					importedWorkspaceLinks={importedWorkspaceLinks}
					onExportWorkspace={onExportWorkspace}
					onImportWorkspace={onImportWorkspace}
					onLoadRetentionPolicy={onLoadRetentionPolicy}
					retentionPolicy={retentionPolicy}
				/>
				<section className="admin-section full-width">
					<h4>Capabilities</h4>
					{capabilities ? (
						<>
							<div className="capability-grid">
								<CapabilityControl
									capability="read"
									label="Read link"
									onRevokeCapability={onRevokeCapability}
									onRotateCapability={onRotateCapability}
									state={capabilities.read}
								/>
								<CapabilityControl
									capability="edit"
									label="Edit link"
									onRevokeCapability={onRevokeCapability}
									onRotateCapability={onRotateCapability}
									state={capabilities.edit}
								/>
							</div>
							{capabilityNotice ? (
								<p className="capability-notice">{capabilityNotice}</p>
							) : null}
							<div className="capability-links">
								{capabilityLinks.workspaceUrl ? (
									<a
										href={capabilityLinks.workspaceUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										Open new read link
									</a>
								) : null}
								{capabilityLinks.rawUrl ? (
									<a
										href={capabilityLinks.rawUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										Open new raw link
									</a>
								) : null}
								{capabilityLinks.editUrl ? (
									<a
										href={capabilityLinks.editUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										Open new edit link
									</a>
								) : null}
							</div>
						</>
					) : (
						<p className="empty-copy">Capability status is unavailable.</p>
					)}
				</section>
				<section className="admin-section full-width">
					<h4>Recent conflicts</h4>
					{stats.conflicts.recent.length === 0 ? (
						<p className="empty-copy">No conflicts recorded.</p>
					) : (
						<ol className="admin-event-list">
							{stats.conflicts.recent.map((event) => (
								<li key={`${event.createdAt}:${event.path ?? "workspace"}`}>
									<div>
										<strong>{event.type}</strong>
										<span>{event.actor ?? "unknown actor"}</span>
									</div>
									<small>
										{event.path ?? "workspace"} · latest v
										{String(event.payload.latestVersion ?? "none")} ·{" "}
										{formatDateTime(event.createdAt)}
									</small>
								</li>
							))}
						</ol>
					)}
				</section>
			</div>
		</section>
	);
}

function CapabilityControl({
	capability,
	label,
	onRevokeCapability,
	onRotateCapability,
	state,
}: {
	capability: CapabilityKind;
	label: string;
	onRevokeCapability: (capability: CapabilityKind) => void;
	onRotateCapability: (capability: CapabilityKind) => void;
	state: WorkspaceCapabilityState;
}) {
	const rotate = useCallback(() => {
		onRotateCapability(capability);
	}, [capability, onRotateCapability]);
	const revoke = useCallback(() => {
		onRevokeCapability(capability);
	}, [capability, onRevokeCapability]);

	return (
		<div className="capability-control">
			<div>
				<KeyRound aria-hidden="true" size={17} />
				<div>
					<strong>{label}</strong>
					<span>
						{state.tokenActive ? "Active token" : "No active token"} ·{" "}
						{state.access}
					</span>
				</div>
			</div>
			<div className="capability-actions">
				<Button
					disabled={!state.canRotate}
					onClick={rotate}
					type="button"
					variant="outline"
				>
					<span>Rotate</span>
				</Button>
				<Button
					disabled={!state.canRevoke}
					onClick={revoke}
					type="button"
					variant="outline"
				>
					<span>Revoke</span>
				</Button>
			</div>
		</div>
	);
}

function AdminImportExportSection({
	adminActionNotice,
	busy,
	importedWorkspaceLinks,
	onExportWorkspace,
	onImportWorkspace,
	onLoadRetentionPolicy,
	retentionPolicy,
}: {
	adminActionNotice: string | null;
	busy: boolean;
	importedWorkspaceLinks: CapabilityLinks;
	onExportWorkspace: () => Promise<void>;
	onImportWorkspace: (sourceFile: File) => void;
	onLoadRetentionPolicy: () => Promise<void>;
	retentionPolicy: WorkspaceRetentionPolicy | null;
}) {
	const exportWorkspace = useCallback(() => {
		onExportWorkspace().catch(() => undefined);
	}, [onExportWorkspace]);
	const loadRetention = useCallback(() => {
		onLoadRetentionPolicy().catch(() => undefined);
	}, [onLoadRetentionPolicy]);
	const importWorkspace = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const sourceFile = event.currentTarget.files?.[0] ?? null;
			event.currentTarget.value = "";
			if (!sourceFile) {
				return;
			}
			onImportWorkspace(sourceFile);
		},
		[onImportWorkspace]
	);

	return (
		<section className="admin-section full-width">
			<h4>Import and export</h4>
			<div className="admin-action-row">
				<Button
					disabled={busy}
					onClick={exportWorkspace}
					type="button"
					variant="outline"
				>
					<Download aria-hidden="true" size={16} />
					<span>Export JSON</span>
				</Button>
				<Label className="admin-file-action">
					<Upload aria-hidden="true" size={16} />
					<span>Import JSON</span>
					<input
						accept="application/json,.json"
						aria-label="Import workspace export JSON"
						disabled={busy}
						onChange={importWorkspace}
						type="file"
					/>
				</Label>
				<Button
					disabled={busy}
					onClick={loadRetention}
					type="button"
					variant="outline"
				>
					<RefreshCw aria-hidden="true" size={16} />
					<span>Load retention</span>
				</Button>
			</div>
			{adminActionNotice ? (
				<p className="capability-notice">{adminActionNotice}</p>
			) : null}
			{retentionPolicy ? (
				<dl className="admin-facts">
					<div>
						<dt>Policy</dt>
						<dd>{formatStatusLabel(retentionPolicy.retention.status)}</dd>
					</div>
					<div>
						<dt>Coverage</dt>
						<dd>{retentionPolicy.retention.coverage.length} areas</dd>
					</div>
					<div>
						<dt>Workspace D1</dt>
						<dd>
							{formatStatusLabel(
								retentionPolicy.retention.perWorkspaceD1.status
							)}
						</dd>
					</div>
				</dl>
			) : null}
			{importedWorkspaceLinks.editUrl ? (
				<div className="capability-links">
					<a
						href={importedWorkspaceLinks.editUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Open imported workspace
					</a>
					{importedWorkspaceLinks.rawUrl ? (
						<a
							href={importedWorkspaceLinks.rawUrl}
							rel="noopener noreferrer"
							target="_blank"
						>
							Open imported raw view
						</a>
					) : null}
				</div>
			) : null}
		</section>
	);
}

function AdminMetric({
	detail,
	label,
	value,
}: {
	detail: string;
	label: string;
	value: string;
}) {
	return (
		<div className="admin-metric">
			<span>{label}</span>
			<strong>{value}</strong>
			<small>{detail}</small>
		</div>
	);
}

function CommentsPanel({
	busy,
	canEdit,
	commentDraft,
	commentLine,
	comments,
	currentVersion,
	file,
	onCommentDraftChange,
	onCommentLineChange,
	onCreateComment,
	onResolveComment,
}: {
	busy: boolean;
	canEdit: boolean;
	commentDraft: string;
	commentLine: string;
	comments: WorkspaceComment[];
	currentVersion: number | null;
	file: WorkspaceFilePayload | null;
	onCommentDraftChange: (value: string) => void;
	onCommentLineChange: (value: string) => void;
	onCreateComment: () => void;
	onResolveComment: (commentId: string) => void;
}) {
	const handleDraftChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			onCommentDraftChange(event.target.value);
		},
		[onCommentDraftChange]
	);
	const handleLineChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			onCommentLineChange(event.target.value);
		},
		[onCommentLineChange]
	);
	const unresolvedCount = comments.filter(
		(comment) => !comment.resolvedAt
	).length;
	const heading = file ? file.path : "No file selected";

	return (
		<section aria-labelledby="comments-heading" className="product-panel">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">Product comments</p>
					<h3 id="comments-heading">{heading}</h3>
				</div>
				<div className="panel-stat">
					<span>{unresolvedCount}</span>
					<strong>open</strong>
				</div>
			</div>
			<div className="comments-layout">
				<section aria-label="Comments" className="comment-list">
					{comments.length === 0 ? (
						<p className="empty-copy">No comments are anchored to this file.</p>
					) : (
						comments.map((comment) => (
							<CommentItem
								canEdit={canEdit}
								comment={comment}
								currentVersion={currentVersion}
								key={comment.id}
								onResolveComment={onResolveComment}
							/>
						))
					)}
				</section>
				<section aria-label="Add comment" className="comment-composer">
					<h4>Add comment</h4>
					{canEdit && file ? (
						<>
							<p>
								New comments anchor to <strong>{file.path}</strong> at version{" "}
								<strong>{file.version}</strong>.
							</p>
							<Label className="field-label">
								<span>Line</span>
								<Input
									className="create-input"
									inputMode="numeric"
									onChange={handleLineChange}
									placeholder="Optional"
									value={commentLine}
								/>
							</Label>
							<Label className="field-label">
								<span>Comment</span>
								<Textarea
									className="comment-textarea"
									onChange={handleDraftChange}
									placeholder="Leave a version-pinned note"
									value={commentDraft}
								/>
							</Label>
							<Button
								disabled={busy || !commentDraft.trim()}
								onClick={onCreateComment}
								type="button"
							>
								<MessageSquare aria-hidden="true" size={16} />
								<span>Add comment</span>
							</Button>
						</>
					) : (
						<p className="empty-copy">
							Open this workspace with an edit link to add or resolve comments.
						</p>
					)}
				</section>
			</div>
		</section>
	);
}

function CommentItem({
	canEdit,
	comment,
	currentVersion,
	onResolveComment,
}: {
	canEdit: boolean;
	comment: WorkspaceComment;
	currentVersion: number | null;
	onResolveComment: (commentId: string) => void;
}) {
	const resolve = useCallback(() => {
		onResolveComment(comment.id);
	}, [comment.id, onResolveComment]);
	const isResolved = Boolean(comment.resolvedAt);
	const hasMoved =
		currentVersion !== null &&
		comment.version !== currentVersion &&
		!isResolved;
	let resolutionAction: ReactNode = null;
	if (isResolved) {
		resolutionAction = (
			<p className="resolved-copy">
				Resolved by {comment.resolvedBy ?? "unknown"}.
			</p>
		);
	} else if (canEdit) {
		resolutionAction = (
			<Button onClick={resolve} type="button" variant="outline">
				<CheckCircle2 aria-hidden="true" size={16} />
				<span>Resolve</span>
			</Button>
		);
	}

	return (
		<article className={isResolved ? "comment-card resolved" : "comment-card"}>
			<header>
				<div className="comment-card-heading">
					<strong>{comment.authorId ?? "unknown author"}</strong>
					<time className="comment-time" dateTime={comment.createdAt}>
						{formatDateTime(comment.createdAt)}
					</time>
				</div>
				<span className={isResolved ? "status-pill resolved" : "status-pill"}>
					{isResolved ? "Resolved" : "Open"}
				</span>
			</header>
			<p>{comment.body}</p>
			<div className="comment-meta">
				<span>Anchored to v{comment.version}</span>
				{currentVersion === null ? null : (
					<span>Current v{currentVersion}</span>
				)}
				{comment.anchor.line ? <span>Line {comment.anchor.line}</span> : null}
				{comment.anchor.heading ? (
					<span>Heading {comment.anchor.heading}</span>
				) : null}
			</div>
			{hasMoved ? (
				<p className="anchor-warning">
					The file changed after this comment was anchored.
				</p>
			) : null}
			{resolutionAction}
		</article>
	);
}

function ActivityPanel({
	eventTypes,
	files,
	filters,
	groups,
	onFiltersChange,
	onSelectPath,
}: {
	eventTypes: string[];
	files: WorkspaceFile[];
	filters: ActivityFilters;
	groups: ActivityGroup[];
	onFiltersChange: (filters: ActivityFilters) => void;
	onSelectPath: (path: string) => void;
}) {
	const selectablePaths = useMemo(
		() => new Set(files.map((file) => file.path)),
		[files]
	);
	const updateFilter = useCallback(
		<Key extends keyof ActivityFilters>(
			key: Key,
			value: ActivityFilters[Key]
		) => {
			onFiltersChange({ ...filters, [key]: value });
		},
		[filters, onFiltersChange]
	);
	const handlePathChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			updateFilter("path", event.target.value);
		},
		[updateFilter]
	);
	const handleActorChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			updateFilter("actor", event.target.value);
		},
		[updateFilter]
	);
	const handleTypeChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			updateFilter("type", event.target.value);
		},
		[updateFilter]
	);
	const handleTimeChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			updateFilter("time", event.target.value as ActivityTimeFilter);
		},
		[updateFilter]
	);
	const clearFilters = useCallback(() => {
		onFiltersChange({ ...DEFAULT_ACTIVITY_FILTERS });
	}, [onFiltersChange]);

	return (
		<section aria-labelledby="activity-heading" className="product-panel">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">Protocol events</p>
					<h3 id="activity-heading">Workspace activity</h3>
				</div>
				<Button onClick={clearFilters} type="button" variant="outline">
					Clear filters
				</Button>
			</div>
			<div className="filter-grid">
				<Label className="field-label">
					<span>Path</span>
					<Input
						className="create-input"
						onChange={handlePathChange}
						placeholder="README.md"
						value={filters.path}
					/>
				</Label>
				<Label className="field-label">
					<span>Actor</span>
					<Input
						className="create-input"
						onChange={handleActorChange}
						placeholder="agent or human"
						value={filters.actor}
					/>
				</Label>
				<Label className="field-label">
					<span>Event</span>
					<select
						className="select-input"
						onChange={handleTypeChange}
						value={filters.type}
					>
						<option value="">All event types</option>
						{eventTypes.map((eventType) => (
							<option key={eventType} value={eventType}>
								{eventType}
							</option>
						))}
					</select>
				</Label>
				<Label className="field-label">
					<span>Time</span>
					<select
						className="select-input"
						onChange={handleTimeChange}
						value={filters.time}
					>
						<option value="all">All time</option>
						<option value="hour">Last hour</option>
						<option value="day">Last day</option>
						<option value="week">Last week</option>
					</select>
				</Label>
			</div>
			<div className="activity-feed">
				{groups.length === 0 ? (
					<p className="empty-copy">No activity matches these filters.</p>
				) : (
					groups.map((group) => (
						<section className="activity-group" key={group.dateKey}>
							<h4>{group.dateKey}</h4>
							<ol>
								{group.events.map((event) => (
									<ActivityEventItem
										event={event}
										isSelectablePath={Boolean(
											event.path && selectablePaths.has(event.path)
										)}
										key={event.id}
										onSelectPath={onSelectPath}
									/>
								))}
							</ol>
						</section>
					))
				)}
			</div>
		</section>
	);
}

function ActivityEventItem({
	event,
	isSelectablePath,
	onSelectPath,
}: {
	event: WorkspaceEvent;
	isSelectablePath: boolean;
	onSelectPath: (path: string) => void;
}) {
	const selectPath = useCallback(() => {
		if (event.path) {
			onSelectPath(event.path);
		}
	}, [event.path, onSelectPath]);

	return (
		<li className="activity-event">
			<div aria-hidden="true" className="event-marker" />
			<div className="event-body">
				<div className="event-title-row">
					<strong>{event.type}</strong>
					<time dateTime={event.createdAt}>
						{formatDateTime(event.createdAt)}
					</time>
				</div>
				<div className="event-meta-row">
					<span>{event.actor ?? "unknown actor"}</span>
					<span>
						{event.version === null ? "no version" : `v${event.version}`}
					</span>
					{event.path && isSelectablePath ? (
						<Button
							className="inline-path-button"
							onClick={selectPath}
							type="button"
							variant="ghost"
						>
							{event.path}
						</Button>
					) : (
						<span>{event.path ?? "workspace"}</span>
					)}
				</div>
			</div>
		</li>
	);
}

function HistoryPanel({
	canEdit,
	diffLines,
	file,
	historicalFile,
	onRestore,
	onSelectVersion,
	selectedVersion,
	versions,
}: {
	canEdit: boolean;
	diffLines: DiffLine[];
	file: WorkspaceFilePayload | null;
	historicalFile: HistoricalWorkspaceFilePayload | null;
	onRestore: () => void;
	onSelectVersion: (version: number) => void;
	selectedVersion: number | null;
	versions: WorkspaceFileVersionMetadata[];
}) {
	const canRestore =
		Boolean(canEdit && file && historicalFile) &&
		historicalFile?.version !== file?.version;
	const heading = file ? file.path : "No file selected";
	const historicalContent = historicalFile ? historicalFile.content : "";

	return (
		<section aria-labelledby="history-heading" className="product-panel">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">File versions</p>
					<h3 id="history-heading">{heading}</h3>
				</div>
				<Button disabled={!canRestore} onClick={onRestore} type="button">
					<RotateCcw aria-hidden="true" size={16} />
					<span>Restore version</span>
				</Button>
			</div>
			{versions.length === 0 ? (
				<p className="empty-copy">
					No file history is available for this path.
				</p>
			) : (
				<div className="history-layout">
					<nav aria-label="File versions" className="version-list">
						{versions.toReversed().map((version) => (
							<VersionListItem
								isSelected={version.version === selectedVersion}
								key={`${version.path}:${version.version}`}
								onSelectVersion={onSelectVersion}
								version={version}
							/>
						))}
					</nav>
					<div className="history-detail">
						<div className="history-summary">
							<div>
								<span>Selected</span>
								<strong>
									{historicalFile
										? `Version ${historicalFile.version}`
										: "None"}
								</strong>
							</div>
							<div>
								<span>Actor</span>
								<strong>{historicalFile?.updatedBy ?? "unknown"}</strong>
							</div>
							<div>
								<span>Size</span>
								<strong>
									{historicalFile ? formatBytes(historicalFile.sizeBytes) : "-"}
								</strong>
							</div>
						</div>
						<div className="history-columns">
							<section>
								<h4>Preview</h4>
								<pre className="history-preview">
									<code>{historicalContent}</code>
								</pre>
							</section>
							<section>
								<h4>Diff to current</h4>
								<ol className="diff-lines">
									{diffLines.map((line) => (
										<DiffLineItem key={diffLineKey(line)} line={line} />
									))}
								</ol>
							</section>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

function VersionListItem({
	isSelected,
	onSelectVersion,
	version,
}: {
	isSelected: boolean;
	onSelectVersion: (version: number) => void;
	version: WorkspaceFileVersionMetadata;
}) {
	const selectVersion = useCallback(() => {
		onSelectVersion(version.version);
	}, [onSelectVersion, version.version]);

	return (
		<Button
			className={isSelected ? "selected" : ""}
			onClick={selectVersion}
			type="button"
			variant="ghost"
		>
			<span>Version {version.version}</span>
			<small>
				{version.updatedBy ?? "unknown"} · {formatDateTime(version.createdAt)}
			</small>
		</Button>
	);
}

function DiffLineItem({ line }: { line: DiffLine }) {
	let marker = " ";
	if (line.kind === "added") {
		marker = "+";
	} else if (line.kind === "removed") {
		marker = "-";
	}
	const lineNumber = line.nextLineNumber ?? line.previousLineNumber ?? "";

	return (
		<li className={`diff-line ${line.kind}`}>
			<span className="diff-marker">{marker}</span>
			<span className="diff-number">{lineNumber}</span>
			<code>{line.content || " "}</code>
		</li>
	);
}

async function loadWorkspaceFile({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	path: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/files${fileQuery(path, tokenQuery)}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as WorkspaceFilePayload;
}

async function loadWorkspaceEventsPayload({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/events${tokenQuery}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as {
		events: WorkspaceEvent[];
		workspaceId: string;
	};
}

async function loadWorkspaceCommentsPayload({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	path: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/comments${fileQuery(path, tokenQuery)}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as {
		comments: WorkspaceComment[];
		workspaceId: string;
	};
}

async function loadWorkspaceAdminStats({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/admin/stats${tokenQuery}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as WorkspaceAdminStats;
}

async function loadWorkspaceCapabilities({
	apiBaseUrl,
	signal,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/capabilities${tokenQuery}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as WorkspaceCapabilitiesPayload;
}

async function loadWorkspaceExport({
	apiBaseUrl,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/export${tokenQuery}`
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as WorkspaceExportBundle;
}

async function importWorkspaceExport({
	apiBaseUrl,
	bundle,
}: {
	apiBaseUrl: string;
	bundle: unknown;
}) {
	const response = await fetch(`${apiBaseUrl}/api/workspaces/import`, {
		body: JSON.stringify(bundle),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as ImportedWorkspacePayload;
}

async function loadWorkspaceRetentionPolicy({
	apiBaseUrl,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/retention${tokenQuery}`
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as WorkspaceRetentionPolicy;
}

async function loadWorkspaceFileVersions({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	path: string;
	signal?: AbortSignal;
	tokenQuery: string;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/files/versions${fileQuery(path, tokenQuery)}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as {
		path: string;
		versions: WorkspaceFileVersionMetadata[];
		workspaceId: string;
	};
}

async function loadHistoricalWorkspaceFile({
	apiBaseUrl,
	path,
	signal,
	tokenQuery,
	version,
	workspaceId,
}: {
	apiBaseUrl: string;
	path: string;
	signal?: AbortSignal;
	tokenQuery: string;
	version: number;
	workspaceId: string;
}) {
	const response = await fetch(
		`${apiBaseUrl}/api/workspaces/${workspaceId}/files/versions/${version}${fileQuery(path, tokenQuery)}`,
		{ signal }
	);

	if (!response.ok) {
		throw new Error(await responseMessage(response));
	}

	return (await response.json()) as HistoricalWorkspaceFilePayload;
}

function fileQuery(path: string, tokenQuery: string) {
	const prefix = tokenQuery ? `${tokenQuery}&` : "?";
	return `${prefix}path=${encodeURIComponent(path)}`;
}

function diffLineKey(line: DiffLine) {
	return [
		line.kind,
		line.previousLineNumber ?? "none",
		line.nextLineNumber ?? "none",
		line.content,
	].join(":");
}

function formatBytes(sizeBytes: number) {
	if (sizeBytes < 1024) {
		return `${sizeBytes} B`;
	}
	const kibibytes = sizeBytes / 1024;
	if (kibibytes < 1024) {
		return `${kibibytes.toFixed(1)} KB`;
	}
	return `${(kibibytes / 1024).toFixed(1)} MB`;
}

function formatCounts(counts: WorkspaceNamedCount[]) {
	if (counts.length === 0) {
		return "no records";
	}
	return counts.map((item) => `${item.name}: ${item.count}`).join(", ");
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function formatStatusLabel(value: string) {
	return value.replaceAll("_", " ");
}

async function responseMessage(response: Response) {
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

function capabilityQuery({
	editToken,
	readToken,
}: {
	editToken: string | null;
	readToken: string | null;
}) {
	if (editToken) {
		return `?edit=${encodeURIComponent(editToken)}`;
	}
	if (readToken) {
		return `?k=${encodeURIComponent(readToken)}`;
	}
	return "";
}

function encodePathSegments(path: string) {
	return path.split("/").map(encodeURIComponent).join("/");
}

function getSearchParam(name: string) {
	return new URLSearchParams(window.location.search).get(name);
}

function replaceWorkspaceUrl({
	editToken,
	workspaceId,
}: {
	editToken: string | null;
	workspaceId: string;
}) {
	const path = `/w/${encodeURIComponent(workspaceId)}`;
	const nextUrl = editToken
		? `${path}?edit=${encodeURIComponent(editToken)}`
		: path;
	window.history.replaceState(null, "", nextUrl);
}

function downloadJsonFile(payload: unknown, filename: string) {
	const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

function getWorkspaceIdFromPath() {
	const match = window.location.pathname.match(WORKSPACE_PATH_PATTERN);
	return match ? decodeURIComponent(match[1] ?? "") : null;
}

function resolveApiBaseUrl() {
	const configured = import.meta.env.VITE_API_BASE_URL?.replace(
		TRAILING_SLASH_PATTERN,
		""
	);
	if (configured) {
		return configured;
	}

	const { hostname, origin, protocol } = window.location;
	if (hostname === "localhost" || hostname === "127.0.0.1") {
		return "http://localhost:3000";
	}
	if (hostname.includes("-web-")) {
		return `${protocol}//${hostname.replace("-web-", "-server-")}`;
	}
	return origin;
}
