export type ActivityTimeFilter = "all" | "hour" | "day" | "week";

export interface WorkspaceEvent {
	actor: string | null;
	createdAt: string;
	id: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	version: number | null;
	workspaceId: string;
}

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
