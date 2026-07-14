import {
	HA2HA_TASK_STATES,
	type Ha2haTaskFrontmatter,
	type Ha2haTaskState,
	ha2haTaskFrontmatterSchema,
} from "@ha2ha/protocol";
import type { WorkspaceOverviewResponse } from "@mdsync/contracts/workspaces";
import { parse } from "yaml";
import { composeWorkspaceActivity } from "./activity";
import { fetchObjectText } from "./objects";
import {
	listWorkspaceComments,
	listWorkspaceEvents,
	listWorkspaceFilesDetailed,
} from "./queries";
import type { WorkspaceFileRow, WorkspaceRow } from "./types";

const FRONTMATTER_BOUNDARY = "---";
const LINE_BREAK_PATTERN = /\r?\n/u;
const RECENT_ACTIVITY_LIMIT = 8;
const TASK_FILE_PATH_PATTERN = /^tasks\/.+\.md$/u;
const TASK_STATE_ORDER: ReadonlyArray<Ha2haTaskState | "invalid"> = [
	"invalid",
	"blocked",
	"review",
	"working",
	"claimed",
	"ready",
	"done",
	"abandoned",
];
const TASK_PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;

type OverviewTaskItem = WorkspaceOverviewResponse["tasks"]["items"][number];

export async function getWorkspaceOverview(
	workspace: WorkspaceRow
): Promise<WorkspaceOverviewResponse> {
	const [files, events, comments] = await Promise.all([
		listWorkspaceFilesDetailed(workspace.id),
		listWorkspaceEvents(workspace.id),
		listWorkspaceComments({ workspaceId: workspace.id }),
	]);
	const taskItems = await buildTaskItems(files);
	const currentVersionByPath = new Map(
		files.map((file) => [file.path, file.version] as const)
	);
	const unresolvedComments = comments.filter(
		(comment) => comment.resolved_at === null
	);

	return {
		activity: {
			recent: composeWorkspaceActivity({ comments, events })
				.slice(0, RECENT_ACTIVITY_LIMIT)
				.map((item) => ({
					actor: item.actor,
					createdAt: item.createdAt,
					path: item.path,
					type: item.type,
					version: item.version,
				})),
		},
		comments: {
			staleAnchors: unresolvedComments.filter((comment) => {
				const currentVersion = currentVersionByPath.get(comment.path);
				return currentVersion !== undefined && comment.version < currentVersion;
			}).length,
			total: comments.length,
			unresolved: unresolvedComments.length,
		},
		files: {
			latestUpdatedAt: latestIsoDate(files.map((file) => file.updated_at)),
			total: files.length,
		},
		generatedAt: new Date().toISOString(),
		tasks: {
			byState: HA2HA_TASK_STATES.map((name) => ({
				count: taskItems.filter((item) => item.state === name).length,
				name,
			})),
			invalidCount: taskItems.filter((item) => !item.valid).length,
			items: taskItems,
			total: taskItems.length,
		},
		workspaceId: workspace.id,
	};
}

async function buildTaskItems(
	files: WorkspaceFileRow[]
): Promise<OverviewTaskItem[]> {
	const taskFiles = files.filter((file) =>
		TASK_FILE_PATH_PATTERN.test(file.path)
	);
	const items = await Promise.all(
		taskFiles.map(async (file) => {
			const frontmatter = parseTaskFrontmatter(await fetchObjectText(file));
			const validation = ha2haTaskFrontmatterSchema.safeParse(frontmatter);
			if (validation.success) {
				return validTaskItem(file, validation.data);
			}
			return invalidTaskItem(file, frontmatter);
		})
	);

	return items.sort(compareTaskItems);
}

function parseTaskFrontmatter(content: string): unknown {
	const lines = content.split(LINE_BREAK_PATTERN);
	if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
		return null;
	}
	const closingBoundaryIndex = lines.findIndex(
		(line, index) => index > 0 && line.trim() === FRONTMATTER_BOUNDARY
	);
	if (closingBoundaryIndex < 0) {
		return null;
	}

	try {
		return parse(lines.slice(1, closingBoundaryIndex).join("\n"));
	} catch {
		return null;
	}
}

function validTaskItem(
	file: WorkspaceFileRow,
	frontmatter: Ha2haTaskFrontmatter
): OverviewTaskItem {
	return {
		id: frontmatter.id,
		owner: frontmatter.owner ?? null,
		path: file.path,
		priority: frontmatter.priority ?? null,
		state: frontmatter.state,
		title: frontmatter.title,
		updatedBy: file.updated_by,
		valid: true,
		version: file.version,
	};
}

function invalidTaskItem(
	file: WorkspaceFileRow,
	frontmatter: unknown
): OverviewTaskItem {
	const record = asRecord(frontmatter);
	return {
		id: stringValue(record?.id),
		owner: nullableStringValue(record?.owner),
		path: file.path,
		priority: priorityValue(record?.priority),
		state: stateValue(record?.state),
		title: stringValue(record?.title),
		updatedBy: file.updated_by,
		valid: false,
		version: file.version,
	};
}

function compareTaskItems(left: OverviewTaskItem, right: OverviewTaskItem) {
	const stateDifference = taskStateRank(left) - taskStateRank(right);
	if (stateDifference !== 0) {
		return stateDifference;
	}
	const priorityDifference =
		taskPriorityRank(left.priority) - taskPriorityRank(right.priority);
	return priorityDifference || left.path.localeCompare(right.path);
}

function taskStateRank(item: OverviewTaskItem) {
	return TASK_STATE_ORDER.indexOf(
		item.valid ? (item.state ?? "invalid") : "invalid"
	);
}

function taskPriorityRank(priority: OverviewTaskItem["priority"]) {
	const rank = priority ? TASK_PRIORITY_ORDER.indexOf(priority) : -1;
	return rank < 0 ? TASK_PRIORITY_ORDER.length : rank;
}

function latestIsoDate(values: string[]) {
	return (
		[...values].sort((left, right) => right.localeCompare(left))[0] ?? null
	);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function stringValue(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableStringValue(value: unknown) {
	return value === null ? null : stringValue(value);
}

function priorityValue(value: unknown): OverviewTaskItem["priority"] {
	return typeof value === "string" &&
		TASK_PRIORITY_ORDER.includes(value as (typeof TASK_PRIORITY_ORDER)[number])
		? (value as OverviewTaskItem["priority"])
		: null;
}

function stateValue(value: unknown): Ha2haTaskState | null {
	return typeof value === "string" &&
		HA2HA_TASK_STATES.includes(value as Ha2haTaskState)
		? (value as Ha2haTaskState)
		: null;
}
