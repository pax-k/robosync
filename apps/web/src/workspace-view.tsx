// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: This component declaratively composes route-specific workspace surfaces; data and mutations live in focused modules.
// biome-ignore-all lint/performance/noJsxPropsBind: Route and file handlers bind local navigation context and are not passed to memoized children.
import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import {
	Activity,
	Clock3,
	FileText,
	FolderKanban,
	Home,
	Menu,
	MessageSquare,
	MoreHorizontal,
	RefreshCw,
	Search,
	Settings,
	Share2,
	X,
} from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { MarkdownPreview } from "./components/markdown-preview";
import { CREATED_LINKS_STORAGE_PREFIX } from "./create-workspace-page";
import { useWorkspaceController } from "./use-workspace-controller";
import {
	ActivityPanel,
	AdminPanel,
	CommentsPanel,
	HistoryPanel,
} from "./workspace-components";
import {
	type CreatedLinks,
	capabilitySearch,
	filePathFromLocation,
	MobileLink,
	pageEyebrow,
	RailLink,
	readCreatedLinks,
	routeKind,
	withCapability,
} from "./workspace-navigation";
import {
	ConflictDialog,
	DraftRecoveryDialog,
	OverviewPage,
	ShareDialog,
	WorkPage,
	WorkspaceLoading,
} from "./workspace-pages";
import { groupWorkspaceFiles } from "./workspace-product";
import { encodePathSegments } from "./workspace-utils";

const MarkdownEditor = lazy(async () => {
	const prismModule = await import("prismjs");
	(globalThis as { Prism?: unknown }).Prism =
		prismModule.default ?? prismModule;
	const module = await import("./components/markdown-editor");
	return { default: module.MarkdownEditor };
});

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
	const controller = useWorkspaceController({ workspaceId });
	const location = useLocation();
	const navigate = useNavigate();
	const [fileSearch, setFileSearch] = useState("");
	const [railOpen, setRailOpen] = useState(false);
	const [shareOpen, setShareOpen] = useState(false);
	const [createdLinks, setCreatedLinks] = useState<CreatedLinks | null>(() =>
		readCreatedLinks(workspaceId)
	);
	const basePath = `/w/${encodeURIComponent(workspaceId)}`;
	const route = routeKind(location.pathname, basePath);
	const documentPath = filePathFromLocation(location.pathname, basePath);
	const panel = new URLSearchParams(location.search).get("panel");
	const isDocument = route === "files";

	const navigateWorkspace = useCallback(
		(path: string, nextPanel?: "comments" | "history") => {
			const search = capabilitySearch(location.search);
			if (nextPanel) {
				search.set("panel", nextPanel);
			}
			navigate({ pathname: path, search: search.toString() });
			setRailOpen(false);
		},
		[location.search, navigate]
	);

	const openFile = useCallback(
		(path: string) => {
			controller.setSelectedPath(path);
			navigateWorkspace(`${basePath}/files/${encodePathSegments(path)}`);
		},
		[basePath, controller.setSelectedPath, navigateWorkspace]
	);

	useEffect(() => {
		if (documentPath && documentPath !== controller.selectedPath) {
			controller.setSelectedPath(documentPath);
		}
	}, [controller.selectedPath, controller.setSelectedPath, documentPath]);

	useEffect(() => {
		if (route === "files" && !documentPath && controller.files[0]) {
			openFile(controller.files[0].path);
		}
	}, [controller.files, documentPath, openFile, route]);

	useEffect(() => {
		if (route === "settings" && controller.canEdit) {
			controller.loadAdminStats().catch(() => undefined);
		}
	}, [controller.canEdit, controller.loadAdminStats, route]);

	useEffect(() => {
		if (createdLinks) {
			setShareOpen(true);
		}
	}, [createdLinks]);

	const closeShare = useCallback(() => {
		setShareOpen(false);
		if (createdLinks) {
			sessionStorage.removeItem(
				`${CREATED_LINKS_STORAGE_PREFIX}${workspaceId}`
			);
			setCreatedLinks(null);
		}
	}, [createdLinks, workspaceId]);

	const copyLink = useCallback(async (value: string, label: string) => {
		await navigator.clipboard.writeText(value);
		toast.success(`${label} copied.`);
	}, []);

	const createReadLink = useCallback(() => {
		controller.rotateCapability("read");
	}, [controller.rotateCapability]);

	const filteredFiles = useMemo(() => {
		const query = fileSearch.trim().toLowerCase();
		return query
			? controller.files.filter((file) =>
					file.path.toLowerCase().includes(query)
				)
			: controller.files;
	}, [controller.files, fileSearch]);
	const groupedFiles = useMemo(
		() => groupWorkspaceFiles(filteredFiles),
		[filteredFiles]
	);

	if (!controller.workspace && controller.busy) {
		return <WorkspaceLoading />;
	}

	return (
		<main
			className={`workspace-screen ${controller.mode === "edit" ? "editing" : ""}`}
		>
			<button
				aria-label="Close navigation"
				className={railOpen ? "rail-scrim visible" : "rail-scrim"}
				onClick={() => setRailOpen(false)}
				type="button"
			/>
			<aside className={railOpen ? "workspace-rail open" : "workspace-rail"}>
				<div className="rail-brand">
					<span aria-hidden="true" className="wordmark-mark">
						M
					</span>
					<span>MDSync</span>
					<Button
						aria-label="Close navigation"
						className="rail-close"
						onClick={() => setRailOpen(false)}
						size="icon"
						type="button"
						variant="ghost"
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<div className="rail-workspace">
					<strong>{controller.workspace?.title ?? workspaceId}</strong>
					<code>{workspaceId}</code>
				</div>
				<nav aria-label="Workspace" className="primary-nav">
					<RailLink
						icon={<Home />}
						label="Overview"
						onClick={() => setRailOpen(false)}
						to={withCapability(basePath, location.search)}
					/>
					<RailLink
						icon={<FolderKanban />}
						label="Work"
						onClick={() => setRailOpen(false)}
						to={withCapability(`${basePath}/work`, location.search)}
					/>
					<RailLink
						icon={<FileText />}
						label="Files"
						onClick={() => setRailOpen(false)}
						to={withCapability(
							`${basePath}/files/${encodePathSegments(controller.selectedPath ?? controller.files[0]?.path ?? "README.md")}`,
							location.search
						)}
					/>
					<RailLink
						icon={<Activity />}
						label="Activity"
						onClick={() => setRailOpen(false)}
						to={withCapability(`${basePath}/activity`, location.search)}
					/>
					{controller.canEdit ? (
						<RailLink
							icon={<Settings />}
							label="Settings"
							onClick={() => setRailOpen(false)}
							to={withCapability(`${basePath}/settings`, location.search)}
						/>
					) : null}
				</nav>
				<div className="rail-files-heading">
					<span>Files</span>
					<small>{controller.files.length}</small>
				</div>
				{controller.files.length > 8 ? (
					<label className="rail-search" htmlFor="workspace-file-search">
						<Search aria-hidden="true" />
						<span className="sr-only">Search files</span>
						<Input
							id="workspace-file-search"
							onChange={(event) => setFileSearch(event.target.value)}
							placeholder="Find a file"
							value={fileSearch}
						/>
					</label>
				) : null}
				<nav aria-label="Workspace files" className="grouped-file-list">
					{groupedFiles.map((group) => (
						<section key={group.name}>
							<h2>{group.name}</h2>
							{group.files.map((item) => (
								<Button
									className={
										item.path === controller.selectedPath ? "selected" : ""
									}
									key={item.path}
									onClick={() => openFile(item.path)}
									type="button"
									variant="ghost"
								>
									<FileText aria-hidden="true" />
									<span>{item.path}</span>
									{controller.draftPaths.includes(item.path) ? (
										<i>Draft</i>
									) : (
										<small>v{item.version}</small>
									)}
								</Button>
							))}
						</section>
					))}
				</nav>
				<div className="rail-access">
					<span
						className={controller.canEdit ? "access-dot edit" : "access-dot"}
					/>
					<div>
						<strong>{controller.canEdit ? "Edit access" : "Read only"}</strong>
						<span>
							{controller.canEdit
								? "Changes require Save"
								: "Viewing durable state"}
						</span>
					</div>
				</div>
			</aside>

			<section className="workspace-main">
				<header className="workspace-header">
					<div className="header-title">
						<Button
							aria-label="Open navigation"
							className="menu-button"
							onClick={() => setRailOpen(true)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<Menu aria-hidden="true" />
						</Button>
						<div>
							<span>{pageEyebrow(route)}</span>
							<strong>
								{isDocument
									? (controller.file?.path ?? "Document")
									: (controller.workspace?.title ?? workspaceId)}
							</strong>
						</div>
					</div>
					<div className="header-actions">
						<Button
							onClick={() => setShareOpen(true)}
							type="button"
							variant="outline"
						>
							<Share2 aria-hidden="true" />
							Share
						</Button>
						<details className="overflow-menu">
							<summary aria-label="More workspace actions">
								<MoreHorizontal aria-hidden="true" />
							</summary>
							<div>
								<Button
									onClick={controller.handleRefresh}
									type="button"
									variant="ghost"
								>
									<RefreshCw aria-hidden="true" />
									Refresh
								</Button>
								{controller.rawUrl && isDocument ? (
									<a
										href={controller.rawUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										Open raw file
									</a>
								) : null}
							</div>
						</details>
					</div>
				</header>

				{controller.error ? (
					<div className="error-banner" role="alert">
						<span>{controller.error}</span>
						<Button
							onClick={controller.handleRefresh}
							type="button"
							variant="outline"
						>
							Try again
						</Button>
					</div>
				) : null}

				<div
					className={
						isDocument && panel
							? "workspace-content with-inspector"
							: "workspace-content"
					}
				>
					{route === "overview" && controller.overview ? (
						<OverviewPage
							files={controller.files}
							onOpenFile={openFile}
							overview={controller.overview}
						/>
					) : null}
					{route === "work" && controller.overview ? (
						<WorkPage onOpenFile={openFile} overview={controller.overview} />
					) : null}
					{route === "activity" ? (
						<div className="page-content">
							<ActivityPanel
								eventTypes={controller.activityTypes}
								files={controller.files}
								filters={controller.activityFilters}
								groups={controller.activityGroups}
								onFiltersChange={controller.setActivityFilters}
								onSelectPath={openFile}
							/>
						</div>
					) : null}
					{route === "settings" && controller.canEdit ? (
						<div className="page-content">
							<AdminPanel
								adminActionNotice={controller.adminActionNotice}
								busy={controller.busy}
								canEdit={controller.canEdit}
								capabilities={controller.capabilities}
								capabilityLinks={controller.capabilityLinks}
								capabilityNotice={controller.capabilityNotice}
								importedWorkspaceLinks={controller.importedWorkspaceLinks}
								onExportWorkspace={controller.exportWorkspace}
								onImportWorkspace={controller.importWorkspace}
								onLoadRetentionPolicy={controller.loadRetentionPolicy}
								onRefresh={controller.loadAdminStats}
								onRevokeCapability={controller.revokeCapability}
								onRotateCapability={controller.rotateCapability}
								retentionPolicy={controller.retentionPolicy}
								stats={controller.adminStats}
							/>
						</div>
					) : null}
					{route === "settings" && !controller.canEdit ? (
						<div className="page-content">
							<section className="panel-card">
								<h2>Settings require edit access</h2>
								<p>
									Open this workspace with an edit link to manage sharing,
									retention, and diagnostics.
								</p>
							</section>
						</div>
					) : null}
					{isDocument ? (
						<DocumentPage
							controller={controller}
							onClosePanel={() =>
								navigateWorkspace(
									`${basePath}/files/${encodePathSegments(controller.selectedPath ?? "README.md")}`
								)
							}
							onPanel={(nextPanel) =>
								navigateWorkspace(
									`${basePath}/files/${encodePathSegments(controller.selectedPath ?? "README.md")}`,
									nextPanel
								)
							}
							panel={panel}
						/>
					) : null}
				</div>
			</section>

			<nav aria-label="Mobile workspace navigation" className="mobile-nav">
				<MobileLink
					icon={<Home />}
					label="Overview"
					to={withCapability(basePath, location.search)}
				/>
				<MobileLink
					icon={<FolderKanban />}
					label="Work"
					to={withCapability(`${basePath}/work`, location.search)}
				/>
				<MobileLink
					icon={<FileText />}
					label="Files"
					to={withCapability(
						`${basePath}/files/${encodePathSegments(controller.selectedPath ?? controller.files[0]?.path ?? "README.md")}`,
						location.search
					)}
				/>
				<MobileLink
					icon={<MoreHorizontal />}
					label="More"
					to={withCapability(
						controller.canEdit
							? `${basePath}/settings`
							: `${basePath}/activity`,
						location.search
					)}
				/>
			</nav>

			{controller.conflict ? (
				<ConflictDialog
					conflict={controller.conflict}
					onCopyDraft={() =>
						controller.copyLocalConflict().catch(() => undefined)
					}
					onEditMerged={controller.editMergedConflict}
					onUseLatest={controller.useLatestConflict}
				/>
			) : null}
			{controller.draftRecovery ? (
				<DraftRecoveryDialog
					onDiscard={controller.discardRecoveredDraft}
					onRestore={controller.restoreRecoveredDraft}
					recovery={controller.draftRecovery}
				/>
			) : null}
			{shareOpen ? (
				<ShareDialog
					busy={controller.busy}
					editUrl={createdLinks?.editUrl ?? controller.capabilityLinks.editUrl}
					onClose={closeShare}
					onCopy={(value, label) =>
						copyLink(value, label).catch(() => undefined)
					}
					onCreateReadLink={createReadLink}
					readUrl={
						createdLinks?.workspaceUrl ??
						controller.capabilityLinks.workspaceUrl ??
						(controller.canEdit ? undefined : window.location.href)
					}
				/>
			) : null}
		</main>
	);
}

function DocumentPage({
	controller,
	onClosePanel,
	onPanel,
	panel,
}: {
	controller: ReturnType<typeof useWorkspaceController>;
	onClosePanel: () => void;
	onPanel: (panel: "comments" | "history") => void;
	panel: string | null;
}) {
	const dirty = Boolean(
		controller.file && controller.draft !== controller.file.content
	);
	return (
		<>
			<article className="document-page">
				<header className="document-actions">
					<div>
						<p className="eyebrow">Markdown document</p>
						<h2>{controller.file?.path ?? "Loading document"}</h2>
						{controller.file ? (
							<span>
								Version {controller.file.version} ·{" "}
								{controller.file.updatedBy ?? "unknown actor"}
							</span>
						) : null}
					</div>
					<div>
						{controller.canEdit && controller.mode !== "edit" ? (
							<Button onClick={controller.enterEditing} type="button">
								Edit
							</Button>
						) : null}
						{controller.canEdit && controller.mode === "edit" ? (
							<>
								<Button
									onClick={controller.cancelEditing}
									type="button"
									variant="ghost"
								>
									Cancel
								</Button>
								<Button
									disabled={controller.busy || !dirty}
									onClick={controller.saveFile}
									type="button"
								>
									Save changes
								</Button>
							</>
						) : null}
						<Button
							className={panel === "comments" ? "active" : ""}
							onClick={() => onPanel("comments")}
							type="button"
							variant="outline"
						>
							<MessageSquare aria-hidden="true" />
							Comments
						</Button>
						<Button
							className={panel === "history" ? "active" : ""}
							onClick={() => onPanel("history")}
							type="button"
							variant="outline"
						>
							<Clock3 aria-hidden="true" />
							History
						</Button>
					</div>
				</header>
				<div
					className={
						controller.mode === "edit" ? "editor-surface" : "reading-surface"
					}
				>
					{controller.mode === "edit" && controller.canEdit ? (
						<Suspense fallback={<WorkspaceLoading />}>
							<MarkdownEditor
								baselineMarkdown={controller.file?.content ?? ""}
								markdown={controller.draft}
								onEditorError={controller.handleEditorError}
								onMarkdownChange={controller.handleDraftChange}
								revisionKey={controller.editorRevisionKey}
							/>
						</Suspense>
					) : (
						<MarkdownPreview markdown={controller.file?.content ?? ""} />
					)}
				</div>
			</article>
			{panel === "comments" || panel === "history" ? (
				<aside className="document-inspector">
					<header>
						<strong>{panel === "comments" ? "Comments" : "History"}</strong>
						<Button
							aria-label="Close inspector"
							onClick={onClosePanel}
							size="icon"
							type="button"
							variant="ghost"
						>
							<X aria-hidden="true" />
						</Button>
					</header>
					{panel === "comments" ? (
						<CommentsPanel
							busy={controller.busy}
							canEdit={controller.canEdit}
							commentDraft={controller.commentDraft}
							commentLine={controller.commentLine}
							comments={controller.comments}
							currentVersion={controller.file?.version ?? null}
							file={controller.file}
							onCommentDraftChange={controller.setCommentDraft}
							onCommentLineChange={controller.setCommentLine}
							onCreateComment={controller.createComment}
							onResolveComment={controller.resolveComment}
						/>
					) : (
						<HistoryPanel
							canEdit={controller.canEdit}
							diffLines={controller.diffLines}
							file={controller.file}
							historicalFile={controller.historicalFile}
							onRestore={controller.restoreHistoricalVersion}
							onSelectVersion={controller.setSelectedHistoryVersion}
							selectedVersion={controller.selectedHistoryVersion}
							versions={controller.fileVersions}
						/>
					)}
				</aside>
			) : null}
		</>
	);
}
