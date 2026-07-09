import { FolderTree } from "lucide-react";
import { lazy, type ReactNode, Suspense } from "react";
import { MarkdownPreview } from "./components/markdown-preview";
import { useWorkspaceController } from "./use-workspace-controller";
import {
	ActivityPanel,
	AdminPanel,
	CommentsPanel,
	DocumentToolbar,
	FileListItem,
	HistoryPanel,
} from "./workspace-components";

const MarkdownEditor = lazy(async () => {
	const prismModule = await import("prismjs");
	(globalThis as { Prism?: unknown }).Prism =
		prismModule.default ?? prismModule;

	const module = await import("./components/markdown-editor");

	return { default: module.MarkdownEditor };
});

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
	const {
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
		fileVersions,
		files,
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
	} = useWorkspaceController({ workspaceId });
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
