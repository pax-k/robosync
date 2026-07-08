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
	ExternalLink,
	FileText,
	FolderTree,
	RefreshCw,
	Save,
	SquarePen,
} from "lucide-react";
import {
	type ChangeEvent,
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

import type { MarkdownEditorError } from "./components/markdown-editor";
import { MarkdownPreview } from "./components/markdown-preview";

const MarkdownEditor = lazy(async () => {
	const prismModule = await import("prismjs");
	(globalThis as { Prism?: unknown }).Prism =
		prismModule.default ?? prismModule;

	const module = await import("./components/markdown-editor");

	return { default: module.MarkdownEditor };
});

type AccessMode = "public" | "token";
type WriteAccessMode = "none" | "public" | "token";
type ViewMode = "preview" | "edit";

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
	const tokenQuery = useMemo(() => capabilityQuery(), []);
	const editToken = useMemo(() => getSearchParam("edit"), []);
	const canEdit = Boolean(editToken);
	const [workspace, setWorkspace] = useState<WorkspaceMetadata | null>(null);
	const [files, setFiles] = useState<WorkspaceFile[]>([]);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [file, setFile] = useState<WorkspaceFilePayload | null>(null);
	const [draft, setDraft] = useState("");
	const [mode, setMode] = useState<ViewMode>(canEdit ? "edit" : "preview");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Workspace load failed."
			);
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, tokenQuery, workspaceId]);

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
			return;
		}

		const controller = new AbortController();
		loadSelectedFile(selectedPath, controller.signal).catch(() => undefined);

		return () => controller.abort();
	}, [loadSelectedFile, selectedPath]);

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
						actor: "web",
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
			setMode("preview");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Save failed.");
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, draft, editToken, file, workspaceId]);

	const handleDraftChange = useCallback((nextMarkdown: string) => {
		setDraft(nextMarkdown);
	}, []);
	const handleEditorError = useCallback((payload: MarkdownEditorError) => {
		setError(
			`Markdown editor could not parse this file. Switch to source mode to recover: ${payload.error}`
		);
	}, []);
	const handleRefresh = useCallback(async () => {
		await loadWorkspace();
		if (selectedPath) {
			await loadSelectedFile(selectedPath);
		}
	}, [loadSelectedFile, loadWorkspace, selectedPath]);
	const toggleMode = useCallback(() => {
		setMode((currentMode) => (currentMode === "edit" ? "preview" : "edit"));
	}, []);

	const rawUrl = file
		? `${apiBaseUrl}/w/${workspaceId}/raw/${encodePathSegments(file.path)}${tokenQuery}`
		: null;
	const editorRevisionKey = file ? `${file.path}:${file.version}` : "empty";

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
						onRefresh={handleRefresh}
						onSave={saveFile}
						onToggleMode={toggleMode}
						rawUrl={rawUrl}
					/>
				</header>

				{error ? <p className="error-banner">{error}</p> : null}

				<div className="document-surface">
					{mode === "edit" && canEdit ? (
						<Suspense
							fallback={<div className="editor-loading">Loading editor</div>}
						>
							<MarkdownEditor
								baselineMarkdown={file?.content ?? ""}
								markdown={draft}
								onEditorError={handleEditorError}
								onMarkdownChange={handleDraftChange}
								revisionKey={editorRevisionKey}
							/>
						</Suspense>
					) : (
						<MarkdownPreview markdown={file?.content ?? ""} />
					)}
				</div>
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
	onRefresh,
	onSave,
	onToggleMode,
	rawUrl,
}: {
	busy: boolean;
	canEdit: boolean;
	file: WorkspaceFilePayload | null;
	mode: ViewMode;
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
										className={mode === "edit" ? "active" : ""}
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

function fileQuery(path: string, tokenQuery: string) {
	const prefix = tokenQuery ? `${tokenQuery}&` : "?";
	return `${prefix}path=${encodeURIComponent(path)}`;
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

function capabilityQuery() {
	const search = new URLSearchParams(window.location.search);
	const edit = search.get("edit");
	const read = search.get("k");
	if (edit) {
		return `?edit=${encodeURIComponent(edit)}`;
	}
	if (read) {
		return `?k=${encodeURIComponent(read)}`;
	}
	return "";
}

function encodePathSegments(path: string) {
	return path.split("/").map(encodeURIComponent).join("/");
}

function getSearchParam(name: string) {
	return new URLSearchParams(window.location.search).get(name);
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
