import type { WorkspaceActivityItem } from "@mdsync/contracts/workspaces";

export type ActivityTimeFilter = "all" | "hour" | "day" | "week";

const DECISION_OR_LOG_PATH_PATTERN = /(^|\/)(decision|log)s?[-_.]/iu;

export type WorkspaceEvent = WorkspaceActivityItem;

export interface ActivityFilters {
	actor: string;
	path: string;
	time: ActivityTimeFilter;
	type: string;
}

export interface ActivityGroup {
	dateKey: string;
	events: WorkspaceEvent[];
}

export type DiffLineKind = "added" | "removed" | "unchanged";

export interface DiffLine {
	content: string;
	kind: DiffLineKind;
	nextLineNumber: number | null;
	previousLineNumber: number | null;
}

export interface RestoreDraftInput {
	contentType: string;
	currentVersion: number;
	historicalContent: string;
	path: string;
	restoreActor: string;
}

export type FileGroupName =
	| "Overview"
	| "Tasks"
	| "Evidence"
	| "Decisions and logs"
	| "Other";

export interface GroupableFile {
	path: string;
}

export interface FocusAction {
	description: string;
	kind: "active" | "blocked" | "clear" | "invalid" | "ready" | "review";
	path: string | null;
	title: string;
}

export interface FocusOverview {
	comments: { unresolved: number };
	tasks: {
		items: Array<{
			path: string;
			state: string | null;
			title: string | null;
			valid: boolean;
		}>;
	};
}

export function resolveConflictState({
	choice,
	localContent,
	remoteContent,
	remoteVersion,
}: {
	choice: "edit-merged" | "use-latest";
	localContent: string;
	remoteContent: string;
	remoteVersion: number;
}) {
	return {
		baseVersion: remoteVersion,
		content: choice === "use-latest" ? remoteContent : localContent,
		mode: choice === "use-latest" ? "preview" : "edit",
	} as const;
}

const FILE_GROUP_ORDER: FileGroupName[] = [
	"Overview",
	"Tasks",
	"Evidence",
	"Decisions and logs",
	"Other",
];

export function groupWorkspaceFiles<File extends GroupableFile>(files: File[]) {
	const groups = new Map<FileGroupName, File[]>(
		FILE_GROUP_ORDER.map((name) => [name, []])
	);
	for (const file of files) {
		groups.get(fileGroupForPath(file.path))?.push(file);
	}
	return FILE_GROUP_ORDER.map((name) => ({
		files: groups.get(name) ?? [],
		name,
	})).filter((group) => group.files.length > 0);
}

export function focusActionForOverview(overview: FocusOverview): FocusAction {
	const invalid = overview.tasks.items.find((task) => !task.valid);
	if (invalid) {
		return {
			description:
				"Repair its frontmatter so the workspace can track it safely.",
			kind: "invalid",
			path: invalid.path,
			title: `Fix ${invalid.title ?? invalid.path}`,
		};
	}
	const blocked = overview.tasks.items.find((task) => task.state === "blocked");
	if (blocked) {
		return {
			description: "Remove the blocker or record the next handoff.",
			kind: "blocked",
			path: blocked.path,
			title: `Unblock ${blocked.title ?? blocked.path}`,
		};
	}
	const review = overview.tasks.items.find((task) => task.state === "review");
	if (review || overview.comments.unresolved > 0) {
		return {
			description: review
				? "Review the result and resolve its open feedback."
				: `Resolve ${overview.comments.unresolved} open comment${overview.comments.unresolved === 1 ? "" : "s"}.`,
			kind: "review",
			path: review?.path ?? null,
			title: review
				? `Review ${review.title ?? review.path}`
				: "Review feedback",
		};
	}
	const active = overview.tasks.items.find(
		(task) => task.state === "working" || task.state === "claimed"
	);
	if (active) {
		return {
			description: "Continue from the latest durable workspace state.",
			kind: "active",
			path: active.path,
			title: `Continue ${active.title ?? active.path}`,
		};
	}
	const ready = overview.tasks.items.find((task) => task.state === "ready");
	if (ready) {
		return {
			description: "Claim the next ready task and record progress in Markdown.",
			kind: "ready",
			path: ready.path,
			title: `Start ${ready.title ?? ready.path}`,
		};
	}
	return {
		description: "There are no blocked, active, review, or ready tasks.",
		kind: "clear",
		path: null,
		title: "Workspace clear",
	};
}

export function activityLabel(type: string) {
	const labels: Record<string, string> = {
		"comment.created": "Added a comment",
		"comment.resolved": "Resolved a comment",
		"file.created": "Created a file",
		"file.deleted": "Deleted a file",
		"file.updated": "Updated a file",
		"workspace.created": "Created the workspace",
	};
	return labels[type] ?? type.replaceAll(".", " ").replaceAll("_", " ");
}

function fileGroupForPath(path: string): FileGroupName {
	if (path === "README.md" || path === "STATUS.md" || path === "HA2HA.md") {
		return "Overview";
	}
	if (path.startsWith("tasks/")) {
		return "Tasks";
	}
	if (path.startsWith("evidence/")) {
		return "Evidence";
	}
	if (
		path.startsWith("decisions/") ||
		path.startsWith("logs/") ||
		DECISION_OR_LOG_PATH_PATTERN.test(path)
	) {
		return "Decisions and logs";
	}
	return "Other";
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

const TIME_FILTER_MS = {
	all: null,
	day: ONE_DAY_MS,
	hour: ONE_HOUR_MS,
	week: ONE_WEEK_MS,
} as const satisfies Record<ActivityTimeFilter, number | null>;

export function filterWorkspaceEvents({
	events,
	filters,
	now,
}: {
	events: WorkspaceEvent[];
	filters: ActivityFilters;
	now: Date;
}) {
	const normalizedActor = filters.actor.trim().toLowerCase();
	const normalizedPath = filters.path.trim().toLowerCase();
	const cutoffMs = cutoffForTimeFilter(filters.time, now);

	return events.filter((event) => {
		const actorMatches =
			!normalizedActor ||
			(event.actor ?? "").toLowerCase().includes(normalizedActor);
		const pathMatches =
			!normalizedPath ||
			(event.path ?? "").toLowerCase().includes(normalizedPath);
		const typeMatches = !filters.type || event.type === filters.type;
		const timeMatches =
			cutoffMs === null || Date.parse(event.createdAt) >= cutoffMs;

		return actorMatches && pathMatches && typeMatches && timeMatches;
	});
}

export function groupActivityByDay(events: WorkspaceEvent[]): ActivityGroup[] {
	const sortedEvents = [...events].sort(compareEventsNewestFirst);
	const groups: ActivityGroup[] = [];

	for (const event of sortedEvents) {
		const dateKey = event.createdAt.slice(0, 10);
		const latestGroup = groups.at(-1);
		if (latestGroup?.dateKey === dateKey) {
			latestGroup.events.push(event);
		} else {
			groups.push({ dateKey, events: [event] });
		}
	}

	return groups;
}

export function uniqueEventTypes(events: WorkspaceEvent[]) {
	const types = new Set<string>();
	for (const event of events) {
		types.add(event.type);
	}
	return [...types].sort((left, right) => left.localeCompare(right));
}

export function buildLineDiff(previousContent: string, nextContent: string) {
	const previousLines = splitComparableLines(previousContent);
	const nextLines = splitComparableLines(nextContent);
	const lengths = buildLongestCommonSubsequenceLengths(
		previousLines,
		nextLines
	);
	const diff: DiffLine[] = [];
	let previousIndex = 0;
	let nextIndex = 0;

	while (previousIndex < previousLines.length || nextIndex < nextLines.length) {
		const previousLine = previousLines[previousIndex];
		const nextLine = nextLines[nextIndex];

		if (previousLine !== undefined && previousLine === nextLine) {
			diff.push({
				content: previousLine,
				kind: "unchanged",
				nextLineNumber: nextIndex + 1,
				previousLineNumber: previousIndex + 1,
			});
			previousIndex += 1;
			nextIndex += 1;
			continue;
		}

		const shouldAddNext =
			nextLine !== undefined &&
			(previousLine === undefined ||
				lcsLength(lengths, previousIndex, nextIndex + 1) >
					lcsLength(lengths, previousIndex + 1, nextIndex));

		if (shouldAddNext) {
			diff.push({
				content: nextLine,
				kind: "added",
				nextLineNumber: nextIndex + 1,
				previousLineNumber: null,
			});
			nextIndex += 1;
			continue;
		}

		if (previousLine !== undefined) {
			diff.push({
				content: previousLine,
				kind: "removed",
				nextLineNumber: null,
				previousLineNumber: previousIndex + 1,
			});
			previousIndex += 1;
		}
	}

	return diff;
}

export function createRestoreDraft({
	contentType,
	currentVersion,
	historicalContent,
	path,
	restoreActor,
}: RestoreDraftInput) {
	return {
		actor: restoreActor,
		baseVersion: currentVersion,
		content: historicalContent,
		contentType,
		path,
	};
}

function buildLongestCommonSubsequenceLengths(
	previousLines: string[],
	nextLines: string[]
) {
	const lengths: number[][] = Array.from({ length: previousLines.length + 1 });

	for (let rowIndex = 0; rowIndex < lengths.length; rowIndex += 1) {
		lengths[rowIndex] = Array.from({ length: nextLines.length + 1 }, () => 0);
	}

	for (
		let previousIndex = previousLines.length - 1;
		previousIndex >= 0;
		previousIndex -= 1
	) {
		for (let nextIndex = nextLines.length - 1; nextIndex >= 0; nextIndex -= 1) {
			const currentRow = lengths[previousIndex];
			if (!currentRow) {
				continue;
			}
			if (previousLines[previousIndex] === nextLines[nextIndex]) {
				currentRow[nextIndex] =
					lcsLength(lengths, previousIndex + 1, nextIndex + 1) + 1;
			} else {
				currentRow[nextIndex] = Math.max(
					lcsLength(lengths, previousIndex + 1, nextIndex),
					lcsLength(lengths, previousIndex, nextIndex + 1)
				);
			}
		}
	}

	return lengths;
}

function lcsLength(lengths: number[][], rowIndex: number, columnIndex: number) {
	return lengths[rowIndex]?.[columnIndex] ?? 0;
}

function compareEventsNewestFirst(left: WorkspaceEvent, right: WorkspaceEvent) {
	const timeDifference =
		Date.parse(right.createdAt) - Date.parse(left.createdAt);
	if (timeDifference !== 0) {
		return timeDifference;
	}
	return right.id.localeCompare(left.id);
}

function cutoffForTimeFilter(time: ActivityTimeFilter, now: Date) {
	const duration = TIME_FILTER_MS[time];
	return duration === null ? null : now.getTime() - duration;
}

function splitComparableLines(content: string) {
	if (!content) {
		return [];
	}
	return content.endsWith("\n")
		? content.slice(0, -1).split("\n")
		: content.split("\n");
}
