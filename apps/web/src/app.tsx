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
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

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

type MarkdownLine =
	| { kind: "blank" }
	| { kind: "block"; node: ReactNode }
	| { kind: "list"; node: ReactNode };

const DEFAULT_PATH = "README.md";
const DEFAULT_CONTENT = "# Robosync workspace\n\nStart writing here.\n";
const WORKSPACE_PATH_PATTERN = /^\/w\/([^/]+)/;
const TRAILING_SLASH_PATTERN = /\/$/;
const HEADING_PATTERN = /^(#{1,4})\s+(.*)$/;
const CHECKBOX_PATTERN = /^- \[( |x|X)\]\s+(.*)$/;
const LIST_ITEM_PATTERN = /^- (.*)$/;

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
						<p className="eyebrow">Robosync</p>
						<h1>Workspace</h1>
					</div>
					<a
						className="icon-link"
						href={apiBaseUrl}
						rel="noreferrer"
						target="_blank"
					>
						<ExternalLink aria-hidden="true" size={18} />
						<span>{new URL(apiBaseUrl).host}</span>
					</a>
				</header>

				<div className="create-form">
					<label>
						<span>Title</span>
						<input onChange={handleTitleChange} value={title} />
					</label>
					<label>
						<span>Path</span>
						<input onChange={handlePathChange} value={path} />
					</label>
					<label className="content-field">
						<span>Markdown</span>
						<textarea onChange={handleContentChange} value={content} />
					</label>
					<div className="action-row">
						<button disabled={busy} onClick={createWorkspace} type="button">
							<FileText aria-hidden="true" size={17} />
							<span>{busy ? "Creating" : "Create"}</span>
						</button>
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

	useEffect(() => {
		if (!selectedPath) {
			setFile(null);
			setDraft("");
			return;
		}

		const controller = new AbortController();
		const path = selectedPath;
		setBusy(true);
		setError(null);

		loadWorkspaceFile({
			apiBaseUrl,
			path,
			signal: controller.signal,
			tokenQuery,
			workspaceId,
		})
			.then((payload) => {
				setFile(payload);
				setDraft(payload.content);
			})
			.catch((cause: unknown) => {
				if (!controller.signal.aborted) {
					setError(
						cause instanceof Error ? cause.message : "File load failed."
					);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setBusy(false);
				}
			});

		return () => controller.abort();
	}, [apiBaseUrl, selectedPath, tokenQuery, workspaceId]);

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

	const handleDraftChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setDraft(event.target.value);
		},
		[]
	);
	const handleRefresh = useCallback(() => {
		loadWorkspace();
	}, [loadWorkspace]);
	const toggleMode = useCallback(() => {
		setMode((currentMode) => (currentMode === "edit" ? "preview" : "edit"));
	}, []);

	const rawUrl = file
		? `${apiBaseUrl}/w/${workspaceId}/raw/${encodePathSegments(file.path)}${tokenQuery}`
		: null;

	return (
		<main className="workspace-screen">
			<aside className="sidebar">
				<div className="brand-row">
					<FolderTree aria-hidden="true" size={20} />
					<span>Robosync</span>
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
					<div>
						<p className="eyebrow">{file?.contentType ?? "markdown"}</p>
						<h2>{file?.path ?? "No file"}</h2>
					</div>
					<div className="toolbar-actions">
						<button onClick={handleRefresh} title="Refresh" type="button">
							<RefreshCw aria-hidden="true" size={17} />
						</button>
						{rawUrl ? (
							<a href={rawUrl} rel="noreferrer" target="_blank" title="Raw">
								<ExternalLink aria-hidden="true" size={17} />
							</a>
						) : null}
						{canEdit ? (
							<button
								className={mode === "edit" ? "active" : ""}
								onClick={toggleMode}
								title="Edit"
								type="button"
							>
								<SquarePen aria-hidden="true" size={17} />
							</button>
						) : null}
						{canEdit && mode === "edit" ? (
							<button
								disabled={busy}
								onClick={saveFile}
								title="Save"
								type="button"
							>
								<Save aria-hidden="true" size={17} />
							</button>
						) : null}
					</div>
				</header>

				{error ? <p className="error-banner">{error}</p> : null}

				<div className="document-surface">
					{mode === "edit" && canEdit ? (
						<textarea
							className="editor"
							onChange={handleDraftChange}
							spellCheck={false}
							value={draft}
						/>
					) : (
						<article className="markdown-preview">
							{renderMarkdown(file?.content ?? "")}
						</article>
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
		<button
			className={isSelected ? "selected" : ""}
			onClick={selectFile}
			type="button"
		>
			<FileText aria-hidden="true" size={16} />
			<span>{item.path}</span>
			<small>v{item.version}</small>
		</button>
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
	signal: AbortSignal;
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

function renderMarkdown(markdown: string) {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const nodes: ReactNode[] = [];
	let codeLines: string[] = [];
	let listItems: ReactNode[] = [];
	let inCode = false;
	let keyIndex = 0;

	for (const line of lines) {
		if (line.startsWith("```")) {
			if (inCode) {
				nodes.push(
					<pre key={nextKey()}>
						<code>{codeLines.join("\n")}</code>
					</pre>
				);
				codeLines = [];
				inCode = false;
			} else {
				closeList();
				inCode = true;
			}
			continue;
		}

		if (inCode) {
			codeLines.push(line);
			continue;
		}

		const renderedLine = renderMarkdownLine(line, nextKey);
		if (renderedLine.kind === "blank") {
			closeList();
			continue;
		}
		if (renderedLine.kind === "list") {
			listItems.push(renderedLine.node);
			continue;
		}
		if (renderedLine.kind === "block") {
			closeList();
			nodes.push(renderedLine.node);
		}
	}

	closeList();
	if (inCode) {
		nodes.push(
			<pre key={nextKey()}>
				<code>{codeLines.join("\n")}</code>
			</pre>
		);
	}

	return nodes;

	function closeList() {
		if (listItems.length > 0) {
			nodes.push(<ul key={nextKey()}>{listItems}</ul>);
			listItems = [];
		}
	}

	function nextKey() {
		keyIndex += 1;
		return `markdown-${keyIndex}`;
	}
}

function renderMarkdownLine(line: string, nextKey: () => string): MarkdownLine {
	if (!line.trim()) {
		return { kind: "blank" };
	}

	const heading = line.match(HEADING_PATTERN);
	if (heading) {
		return {
			kind: "block",
			node: renderHeading(heading[1]?.length ?? 1, heading[2] ?? "", nextKey),
		};
	}

	const checkbox = line.match(CHECKBOX_PATTERN);
	if (checkbox) {
		const checked = checkbox[1]?.toLowerCase() === "x";
		return {
			kind: "list",
			node: (
				<li key={nextKey()}>
					<input checked={checked} disabled type="checkbox" />{" "}
					{checkbox[2] ?? ""}
				</li>
			),
		};
	}

	const listItem = line.match(LIST_ITEM_PATTERN);
	if (listItem) {
		return {
			kind: "list",
			node: <li key={nextKey()}>{listItem[1] ?? ""}</li>,
		};
	}

	return { kind: "block", node: <p key={nextKey()}>{line}</p> };
}

function renderHeading(level: number, text: string, nextKey: () => string) {
	if (level === 1) {
		return <h1 key={nextKey()}>{text}</h1>;
	}
	if (level === 2) {
		return <h2 key={nextKey()}>{text}</h2>;
	}
	if (level === 3) {
		return <h3 key={nextKey()}>{text}</h3>;
	}
	return <h4 key={nextKey()}>{text}</h4>;
}
