// biome-ignore-all lint/performance/noJsxPropsBind: Row and dialog handlers bind immutable item context and are not memoized children.
import { Button } from "@mdsync/ui/components/button";
import { Skeleton } from "@mdsync/ui/components/skeleton";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	CircleDot,
	FileText,
	MessageSquare,
	PlayCircle,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	activityLabel,
	focusActionForOverview,
	groupWorkspaceFiles,
} from "./workspace-product";
import type {
	WorkspaceConflict,
	WorkspaceDraftRecovery,
	WorkspaceFile,
	WorkspaceOverview,
} from "./workspace-types";
import { formatDateTime } from "./workspace-utils";

export function WorkspaceLoading() {
	return (
		<div aria-label="Loading workspace" className="page-content" role="status">
			<Skeleton className="skeleton-title" />
			<div className="overview-grid">
				<Skeleton className="skeleton-card wide" />
				<Skeleton className="skeleton-card" />
				<Skeleton className="skeleton-card" />
			</div>
		</div>
	);
}

export function OverviewPage({
	files,
	onOpenFile,
	overview,
}: {
	files: WorkspaceFile[];
	onOpenFile: (path: string) => void;
	overview: WorkspaceOverview;
}) {
	const focus = focusActionForOverview(overview);
	const attention = overview.tasks.items.filter(
		(task) => !task.valid || task.state === "blocked" || task.state === "review"
	);
	const currentTasks = overview.tasks.items.filter((task) =>
		["working", "claimed", "ready"].includes(task.state ?? "")
	);
	const groups = groupWorkspaceFiles(files);

	return (
		<div className="page-content overview-page">
			<header className="page-heading">
				<div>
					<p className="eyebrow">Today</p>
					<h2>Workspace overview</h2>
				</div>
				<p>Current state, attention, and the next useful action.</p>
			</header>

			<section className={`focus-card ${focus.kind}`}>
				<div className="focus-icon">
					<CircleDot aria-hidden="true" />
				</div>
				<div>
					<p className="eyebrow">Focus</p>
					<h3>{focus.title}</h3>
					<p>{focus.description}</p>
				</div>
				{focus.path ? (
					<Button onClick={() => onOpenFile(focus.path ?? "")} type="button">
						Open task
						<ArrowRight aria-hidden="true" />
					</Button>
				) : null}
			</section>

			<WorkStateRail overview={overview} />

			<div className="overview-grid">
				<section className="panel-card attention-card">
					<div className="card-heading">
						<div>
							<p className="eyebrow">Attention</p>
							<h3>Needs a decision</h3>
						</div>
						<span className="metric-pill">
							{attention.length + overview.comments.unresolved}
						</span>
					</div>
					{attention.length === 0 && overview.comments.unresolved === 0 ? (
						<EmptyState
							copy="Review queues and comments are clear."
							icon={<CheckCircle2 />}
							title="Nothing needs attention"
						/>
					) : (
						<ul className="work-list">
							{attention.slice(0, 5).map((task) => (
								<TaskRow key={task.path} onOpen={onOpenFile} task={task} />
							))}
							{overview.comments.unresolved > 0 ? (
								<li>
									<MessageSquare aria-hidden="true" />
									<div>
										<strong>
											{overview.comments.unresolved} unresolved comment
											{overview.comments.unresolved === 1 ? "" : "s"}
										</strong>
										<span>
											{overview.comments.staleAnchors} anchored to older
											versions
										</span>
									</div>
								</li>
							) : null}
						</ul>
					)}
				</section>

				<section className="panel-card">
					<div className="card-heading">
						<div>
							<p className="eyebrow">Current work</p>
							<h3>Active and ready</h3>
						</div>
						<span className="metric-pill">{currentTasks.length}</span>
					</div>
					{currentTasks.length === 0 ? (
						<EmptyState
							copy="Add a ready task or mark the workspace complete."
							icon={<PlayCircle />}
							title="No active work"
						/>
					) : (
						<ul className="work-list">
							{currentTasks.slice(0, 6).map((task) => (
								<TaskRow key={task.path} onOpen={onOpenFile} task={task} />
							))}
						</ul>
					)}
				</section>

				<section className="panel-card">
					<div className="card-heading">
						<div>
							<p className="eyebrow">Recent</p>
							<h3>Activity</h3>
						</div>
					</div>
					{overview.activity.recent.length === 0 ? (
						<p className="empty-copy">Activity appears as files change.</p>
					) : (
						<ol className="compact-activity">
							{overview.activity.recent.slice(0, 5).map((event) => (
								<li key={`${event.createdAt}:${event.path}:${event.type}`}>
									<span className="activity-dot" />
									<div>
										<strong>{activityLabel(event.type)}</strong>
										<span>
											{event.actor ?? "Unknown actor"} ·{" "}
											{event.path ?? "workspace"}
										</span>
									</div>
									<time dateTime={event.createdAt}>
										{formatDateTime(event.createdAt)}
									</time>
								</li>
							))}
						</ol>
					)}
				</section>

				<section className="panel-card file-groups-card">
					<div className="card-heading">
						<div>
							<p className="eyebrow">Files</p>
							<h3>Workspace documents</h3>
						</div>
						<span className="metric-pill">{overview.files.total}</span>
					</div>
					<div className="overview-file-groups">
						{groups.map((group) => (
							<section key={group.name}>
								<h4>{group.name}</h4>
								{group.files.map((file) => (
									<Button
										key={file.path}
										onClick={() => onOpenFile(file.path)}
										type="button"
										variant="ghost"
									>
										<FileText aria-hidden="true" />
										<span>{file.path}</span>
										<small>v{file.version}</small>
									</Button>
								))}
							</section>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}

export function WorkPage({
	onOpenFile,
	overview,
}: {
	onOpenFile: (path: string) => void;
	overview: WorkspaceOverview;
}) {
	const states = [
		"blocked",
		"review",
		"working",
		"claimed",
		"ready",
		"done",
		"abandoned",
	];
	return (
		<div className="page-content">
			<header className="page-heading">
				<div>
					<p className="eyebrow">Tasks and evidence</p>
					<h2>Work</h2>
				</div>
				<p>Durable work grouped by its current state.</p>
			</header>
			<WorkStateRail overview={overview} />
			<div className="work-sections">
				{overview.tasks.invalidCount > 0 ? (
					<TaskSection
						label="Invalid task files"
						onOpenFile={onOpenFile}
						tasks={overview.tasks.items.filter((task) => !task.valid)}
						tone="attention"
					/>
				) : null}
				{states.map((state) => {
					const tasks = overview.tasks.items.filter(
						(task) => task.valid && task.state === state
					);
					return tasks.length > 0 ? (
						<TaskSection
							key={state}
							label={state}
							onOpenFile={onOpenFile}
							tasks={tasks}
							tone={state === "blocked" ? "attention" : "default"}
						/>
					) : null;
				})}
				{overview.tasks.total === 0 ? (
					<section className="panel-card">
						<EmptyState
							copy="Create a Markdown file under tasks/ to make work visible here."
							icon={<FileText />}
							title="No task files yet"
						/>
					</section>
				) : null}
			</div>
		</div>
	);
}

export function ConflictDialog({
	conflict,
	onCopyDraft,
	onEditMerged,
	onUseLatest,
}: {
	conflict: WorkspaceConflict;
	onCopyDraft: () => void;
	onEditMerged: () => void;
	onUseLatest: () => void;
}) {
	return (
		<ModalFrame
			eyebrow="Version conflict"
			title="This document changed elsewhere."
		>
			<p>
				Your draft and version {conflict.remote.version} are both preserved.
				Choose a safe recovery path.
			</p>
			<div className="comparison-grid">
				<section className="comparison-column">
					<h4>My draft</h4>
					<pre>{conflict.localContent}</pre>
				</section>
				<section className="comparison-column">
					<h4>Latest saved version</h4>
					<pre>{conflict.remote.content}</pre>
				</section>
			</div>
			<div className="modal-actions">
				<Button onClick={onUseLatest} type="button" variant="outline">
					Use latest
				</Button>
				<Button onClick={onCopyDraft} type="button" variant="outline">
					Copy my draft
				</Button>
				<Button onClick={onEditMerged} type="button">
					Edit merged version
				</Button>
			</div>
		</ModalFrame>
	);
}

export function DraftRecoveryDialog({
	onDiscard,
	onRestore,
	recovery,
}: {
	onDiscard: () => void;
	onRestore: () => void;
	recovery: WorkspaceDraftRecovery;
}) {
	return (
		<ModalFrame
			eyebrow="Draft recovery"
			title="A local draft was saved against an older version."
		>
			<p>
				The workspace is now at version {recovery.remote.version}; your draft
				began at version {recovery.draftBaseVersion}. Compare them before
				continuing.
			</p>
			<div className="comparison-grid">
				<section>
					<h4>Local draft</h4>
					<pre>{recovery.draft}</pre>
				</section>
				<section>
					<h4>Latest saved version</h4>
					<pre>{recovery.remote.content}</pre>
				</section>
			</div>
			<div className="modal-actions">
				<Button onClick={onDiscard} type="button" variant="outline">
					Discard draft
				</Button>
				<Button onClick={onRestore} type="button">
					Review in editor
				</Button>
			</div>
		</ModalFrame>
	);
}

export function ShareDialog({
	busy,
	editUrl,
	onClose,
	onCopy,
	onCreateReadLink,
	readUrl,
}: {
	busy: boolean;
	editUrl?: string;
	onClose: () => void;
	onCopy: (value: string, label: string) => void;
	onCreateReadLink: () => void;
	readUrl?: string;
}) {
	return (
		<ModalFrame
			close={
				<Button
					aria-label="Close share dialog"
					onClick={onClose}
					size="icon"
					type="button"
					variant="ghost"
				>
					<X aria-hidden="true" />
				</Button>
			}
			eyebrow="Share"
			title="Workspace links"
		>
			<p>
				Links are capabilities. Send each one only to people who need that level
				of access.
			</p>
			<div className="share-links">
				{readUrl ? (
					<ShareLink label="Read link" onCopy={onCopy} value={readUrl} />
				) : (
					<section>
						<div>
							<strong>No known read link in this session</strong>
							<span>
								Creating one rotates the capability, and the old read link stops
								working.
							</span>
						</div>
						<Button
							disabled={busy}
							onClick={onCreateReadLink}
							type="button"
							variant="outline"
						>
							Create a new read link
						</Button>
					</section>
				)}
				{editUrl ? (
					<ShareLink label="Edit link" onCopy={onCopy} value={editUrl} />
				) : null}
			</div>
		</ModalFrame>
	);
}

function WorkStateRail({ overview }: { overview: WorkspaceOverview }) {
	const count = (state: string) =>
		overview.tasks.byState.find((item) => item.name === state)?.count ?? 0;
	const stages = [
		{ count: count("ready"), label: "Ready" },
		{ count: count("claimed") + count("working"), label: "Active" },
		{ count: count("review"), label: "Review" },
		{ count: count("done"), label: "Done" },
	];
	const blocked = count("blocked") + overview.tasks.invalidCount;
	return (
		<section aria-label="Work state" className="work-state-panel">
			<div className="work-state-rail">
				{stages.map((stage, index) => (
					<div className="work-state-stage" key={stage.label}>
						<span>{stage.count}</span>
						<strong>{stage.label}</strong>
						{index < stages.length - 1 ? (
							<ArrowRight aria-hidden="true" />
						) : null}
					</div>
				))}
			</div>
			{blocked > 0 ? (
				<div className="blocked-interruption">
					<AlertTriangle aria-hidden="true" />
					<strong>{blocked} blocked or invalid</strong>
					<span>Needs attention before flow can continue.</span>
				</div>
			) : null}
		</section>
	);
}

function TaskSection({
	label,
	onOpenFile,
	tasks,
	tone,
}: {
	label: string;
	onOpenFile: (path: string) => void;
	tasks: WorkspaceOverview["tasks"]["items"];
	tone: "attention" | "default";
}) {
	return (
		<section className={`panel-card task-section ${tone}`}>
			<div className="card-heading">
				<h3>{label}</h3>
				<span className="metric-pill">{tasks.length}</span>
			</div>
			<ul className="work-list">
				{tasks.map((task) => (
					<TaskRow key={task.path} onOpen={onOpenFile} task={task} />
				))}
			</ul>
		</section>
	);
}

function TaskRow({
	onOpen,
	task,
}: {
	onOpen: (path: string) => void;
	task: WorkspaceOverview["tasks"]["items"][number];
}) {
	return (
		<li>
			<span className={`status-mark ${task.valid ? task.state : "invalid"}`} />
			<Button onClick={() => onOpen(task.path)} type="button" variant="ghost">
				<span>
					<strong>{task.title ?? task.path}</strong>
					<small>
						{task.id ?? "Invalid metadata"} · {task.owner ?? "Unassigned"}
					</small>
				</span>
				<span className="status-label">
					{task.valid ? task.state : "invalid"}
				</span>
			</Button>
		</li>
	);
}

function EmptyState({
	copy,
	icon,
	title,
}: {
	copy: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<div className="directed-empty">
			<span aria-hidden="true">{icon}</span>
			<div>
				<strong>{title}</strong>
				<p>{copy}</p>
			</div>
		</div>
	);
}

function ModalFrame({
	children,
	close,
	eyebrow,
	title,
}: {
	children: ReactNode;
	close?: ReactNode;
	eyebrow: string;
	title: string;
}) {
	return (
		<div className="modal-backdrop">
			<section
				aria-labelledby="modal-title"
				aria-modal="true"
				className="modal-card"
				role="dialog"
			>
				<header>
					<div>
						<p className="eyebrow">{eyebrow}</p>
						<h3 id="modal-title">{title}</h3>
					</div>
					{close}
				</header>
				{children}
			</section>
		</div>
	);
}

function ShareLink({
	label,
	onCopy,
	value,
}: {
	label: string;
	onCopy: (value: string, label: string) => void;
	value: string;
}) {
	return (
		<section className="share-link-row">
			<div>
				<strong>{label}</strong>
				<code>{value}</code>
			</div>
			<Button
				onClick={() => onCopy(value, label)}
				type="button"
				variant="outline"
			>
				Copy
			</Button>
		</section>
	);
}
