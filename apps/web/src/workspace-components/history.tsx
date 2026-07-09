import { Button } from "@mdsync/ui/components/button";
import { RotateCcw } from "lucide-react";
import { useCallback } from "react";
import type { DiffLine } from "../workspace-product";
import type {
	HistoricalWorkspaceFilePayload,
	WorkspaceFilePayload,
	WorkspaceFileVersionMetadata,
} from "../workspace-types";
import { formatBytes, formatDateTime } from "../workspace-utils";

export function HistoryPanel({
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

function diffLineKey(line: DiffLine) {
	return [
		line.kind,
		line.previousLineNumber ?? "none",
		line.nextLineNumber ?? "none",
		line.content,
	].join(":");
}
