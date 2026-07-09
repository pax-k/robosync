import { Button } from "@mdsync/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@mdsync/ui/components/tooltip";
import {
	Activity,
	BarChart3,
	Clock3,
	ExternalLink,
	MessageSquare,
	RefreshCw,
	Save,
	SquarePen,
} from "lucide-react";
import type { ViewMode, WorkspaceFilePayload } from "../workspace-types";

export function DocumentToolbar({
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
