import { Button } from "@mdsync/ui/components/button";
import { Label } from "@mdsync/ui/components/label";
import { Download, KeyRound, RefreshCw, Upload } from "lucide-react";
import { type ChangeEvent, useCallback } from "react";
import type {
	CapabilityKind,
	CapabilityLinks,
	WorkspaceAdminStats,
	WorkspaceCapabilities,
	WorkspaceCapabilityState,
	WorkspaceRetentionPolicy,
} from "../workspace-types";
import {
	formatBytes,
	formatCounts,
	formatDateTime,
	formatStatusLabel,
} from "../workspace-utils";

export function AdminPanel({
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
						<p className="eyebrow">Settings</p>
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
						<p className="eyebrow">Settings</p>
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
					<p className="eyebrow">Settings</p>
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
					<h4>Advanced diagnostics</h4>
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
					<h4>Operational signals</h4>
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
					<h4>Sharing &amp; access</h4>
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
			<h4>Data &amp; portability</h4>
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
