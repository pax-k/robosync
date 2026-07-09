import { fetchObjectText } from "./objects";
import {
	listAllWorkspaceFileVersions,
	listWorkspaceAdminEvents,
	listWorkspaceComments,
	listWorkspaceEvents,
	listWorkspaceFilesDetailed,
} from "./queries";
import type {
	WorkspaceAdminEventRow,
	WorkspaceAdminStats,
	WorkspaceAdminStatsCount,
	WorkspaceAdminStatsEvent,
	WorkspaceAdminStatsProtocolEvent,
	WorkspaceAdminStatsTaskFile,
	WorkspaceEventRow,
	WorkspaceFileRow,
	WorkspaceRow,
} from "./types";

const CLEANUP_FAILED_EVENT_TYPE = "cleanup.failed";
const VERSION_CONFLICT_EVENT_TYPE = "file.version_conflict";
const RECENT_ADMIN_EVENT_LIMIT = 5;
const RECENT_PROTOCOL_EVENT_LIMIT = 5;
const TASK_FILE_PATH_PATTERN = /^tasks\/.+\.md$/;
const FRONTMATTER_BOUNDARY = "---";
const FRONTMATTER_STATE_PATTERN = /^state:\s*(.+?)\s*$/;
const LINE_BREAK_PATTERN = /\r?\n/;

export async function getWorkspaceAdminStats(
	workspace: WorkspaceRow
): Promise<WorkspaceAdminStats> {
	const [files, versions, events, comments, adminEvents] = await Promise.all([
		listWorkspaceFilesDetailed(workspace.id),
		listAllWorkspaceFileVersions(workspace.id),
		listWorkspaceEvents(workspace.id),
		listWorkspaceComments({ workspaceId: workspace.id }),
		listWorkspaceAdminEvents(workspace.id),
	]);
	const taskStats = await buildTaskStats(files);
	const activeBytes = sumBy(files, (file) => file.size_bytes);
	const versionBytes = sumBy(versions, (version) => version.size_bytes);
	const currentObjectKeys = new Set(files.map((file) => file.object_key));
	const versionObjectKeys = new Set(
		versions.map((version) => version.object_key)
	);
	const indexedObjects = new Set([...currentObjectKeys, ...versionObjectKeys]);
	const latestUpdatedAt = maxIsoDate(files.map((file) => file.updated_at));
	const pathsWithHistory = new Set(
		versions
			.filter((version) => version.version > 1)
			.map((version) => version.path)
	).size;
	const currentVersionByPath = new Map(
		files.map((file) => [file.path, file.version] as const)
	);
	const staleAnchors = comments.filter((comment) => {
		const currentVersion = currentVersionByPath.get(comment.path);
		return (
			!comment.resolved_at &&
			currentVersion !== undefined &&
			comment.version < currentVersion
		);
	}).length;
	const unresolvedComments = comments.filter(
		(comment) => !comment.resolved_at
	).length;
	const conflictEvents = adminEvents.filter(
		(event) => event.type === VERSION_CONFLICT_EVENT_TYPE
	);
	const cleanupFailures = adminEvents.filter(
		(event) => event.type === CLEANUP_FAILED_EVENT_TYPE
	);
	const issues = workspaceHealthIssues({
		activeBytes,
		cleanupFailureCount: cleanupFailures.length,
		conflictCount: conflictEvents.length,
		currentFileCount: files.length,
		missingTaskState: taskStats.missingState,
		staleAnchors,
		workspace,
	});

	return {
		cleanup: {
			failedJobs: cleanupFailures.length,
			latestFailureAt: maxIsoDate(
				cleanupFailures.map((event) => event.created_at)
			),
			orphanedObjects: {
				count: null,
				status: "not_scanned",
			},
		},
		comments: {
			resolved: comments.length - unresolvedComments,
			staleAnchors,
			total: comments.length,
			unresolved: unresolvedComments,
		},
		conflicts: {
			recent: serializeRecentAdminEvents(conflictEvents),
			total: conflictEvents.length,
		},
		events: {
			byType: countBy(events, (event) => event.type),
			recent: serializeRecentProtocolEvents(events),
			total: events.length,
		},
		files: {
			currentCount: files.length,
			latestUpdatedAt,
			totalSizeBytes: activeBytes,
		},
		generatedAt: new Date().toISOString(),
		health: {
			issues,
			status: issues.length === 0 ? "healthy" : "attention",
		},
		retention: {
			coverage: [
				"workspaces",
				"file versions",
				"protocol events",
				"comments",
				"admin events",
				"orphaned objects",
			],
			status: "not_configured",
		},
		storage: {
			activeBytes,
			currentFileRecords: files.length,
			indexedObjects: indexedObjects.size,
			r2Prefix: workspace.r2_prefix,
			versionBytes,
			versionRecords: versions.length,
		},
		tasks: taskStats,
		versions: {
			pathsWithHistory,
			totalCount: versions.length,
		},
		workspace: {
			createdAt: workspace.created_at,
			fileCount: workspace.file_count,
			id: workspace.id,
			lastAccessedAt: workspace.last_accessed_at,
			readAccess: workspace.read_access,
			title: workspace.title,
			totalSizeBytes: workspace.total_size_bytes,
			updatedAt: workspace.updated_at,
			writeAccess: workspace.write_access,
		},
		workspaceId: workspace.id,
	};
}

async function buildTaskStats(
	files: WorkspaceFileRow[]
): Promise<WorkspaceAdminStats["tasks"]> {
	const taskFiles = files.filter((file) =>
		TASK_FILE_PATH_PATTERN.test(file.path)
	);
	const taskContents = await Promise.all(
		taskFiles.map(async (file) => ({
			content: await fetchObjectText(file),
			file,
		}))
	);
	const taskSummaries: WorkspaceAdminStatsTaskFile[] = [];
	const stateCounts = new Map<string, number>();
	let missingState = 0;

	for (const { content, file } of taskContents) {
		const state = parseTaskState(content);
		if (state) {
			stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
		} else {
			missingState += 1;
		}
		taskSummaries.push({
			path: file.path,
			state,
			version: file.version,
		});
	}

	return {
		byState: mapCounts(stateCounts),
		files: taskSummaries,
		missingState,
		total: taskFiles.length,
	};
}

function countBy<T>(
	items: T[],
	getName: (item: T) => string
): WorkspaceAdminStatsCount[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const name = getName(item);
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return mapCounts(counts);
}

function mapCounts(counts: Map<string, number>): WorkspaceAdminStatsCount[] {
	return [...counts.entries()]
		.map(([name, count]) => ({ count, name }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function maxIsoDate(values: Array<string | null>) {
	const dates = values.filter((value): value is string => Boolean(value));
	if (dates.length === 0) {
		return null;
	}
	return dates.sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function parseTaskState(content: string) {
	const lines = content.split(LINE_BREAK_PATTERN);
	if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
		return null;
	}

	for (const line of lines.slice(1)) {
		const trimmed = line.trim();
		if (trimmed === FRONTMATTER_BOUNDARY) {
			return null;
		}
		const match = trimmed.match(FRONTMATTER_STATE_PATTERN);
		if (match?.[1]) {
			return match[1].trim().replace(/^["']|["']$/g, "");
		}
	}

	return null;
}

function parseJsonObject(payload: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(payload);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function serializeRecentAdminEvents(
	events: WorkspaceAdminEventRow[]
): WorkspaceAdminStatsEvent[] {
	return [...events]
		.sort((left, right) => right.created_at.localeCompare(left.created_at))
		.slice(0, RECENT_ADMIN_EVENT_LIMIT)
		.map((event) => ({
			actor: event.actor,
			createdAt: event.created_at,
			path: event.path,
			payload: parseJsonObject(event.payload),
			type: event.type,
		}));
}

function serializeRecentProtocolEvents(
	events: WorkspaceEventRow[]
): WorkspaceAdminStatsProtocolEvent[] {
	return [...events]
		.sort((left, right) => right.created_at.localeCompare(left.created_at))
		.slice(0, RECENT_PROTOCOL_EVENT_LIMIT)
		.map((event) => ({
			actor: event.actor,
			createdAt: event.created_at,
			path: event.path,
			payload: parseJsonObject(event.payload),
			type: event.type,
			version: event.version,
		}));
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
	let total = 0;
	for (const item of items) {
		total += getValue(item);
	}
	return total;
}

function workspaceHealthIssues({
	activeBytes,
	cleanupFailureCount,
	conflictCount,
	currentFileCount,
	missingTaskState,
	staleAnchors,
	workspace,
}: {
	activeBytes: number;
	cleanupFailureCount: number;
	conflictCount: number;
	currentFileCount: number;
	missingTaskState: number;
	staleAnchors: number;
	workspace: WorkspaceRow;
}) {
	const issues: string[] = [];
	if (workspace.file_count !== currentFileCount) {
		issues.push("Workspace file count does not match current file records.");
	}
	if (workspace.total_size_bytes !== activeBytes) {
		issues.push("Workspace byte total does not match current file records.");
	}
	if (conflictCount > 0) {
		issues.push("Version conflicts were observed for this workspace.");
	}
	if (staleAnchors > 0) {
		issues.push("Unresolved comments are anchored to older file versions.");
	}
	if (cleanupFailureCount > 0) {
		issues.push("Cleanup failures need operator review.");
	}
	if (missingTaskState > 0) {
		issues.push("Some task files do not declare a state.");
	}
	return issues;
}
