import type {
	WorkspaceActivityItem,
	WorkspaceActivityResponse,
} from "@mdsync/contracts/workspaces";
import { listWorkspaceComments, listWorkspaceEvents } from "./queries";
import type { WorkspaceCommentRow, WorkspaceEventRow } from "./types";

export async function getWorkspaceActivity(
	workspaceId: string
): Promise<WorkspaceActivityResponse> {
	const [events, comments] = await Promise.all([
		listWorkspaceEvents(workspaceId),
		listWorkspaceComments({ workspaceId }),
	]);

	return {
		items: composeWorkspaceActivity({ comments, events }),
		workspaceId,
	};
}

export function composeWorkspaceActivity({
	comments,
	events,
}: {
	comments: WorkspaceCommentRow[];
	events: WorkspaceEventRow[];
}): WorkspaceActivityItem[] {
	const items = events.map(eventActivityItem);

	for (const comment of comments) {
		items.push({
			actor: comment.author_id,
			createdAt: comment.created_at,
			id: `comment:${comment.id}:created`,
			path: comment.path,
			source: "comment",
			type: "comment.created",
			version: comment.version,
		});
		if (comment.resolved_at) {
			items.push({
				actor: comment.resolved_by,
				createdAt: comment.resolved_at,
				id: `comment:${comment.id}:resolved`,
				path: comment.path,
				source: "comment",
				type: "comment.resolved",
				version: comment.version,
			});
		}
	}

	return items.sort(compareActivityItems);
}

function eventActivityItem(event: WorkspaceEventRow): WorkspaceActivityItem {
	return {
		actor: event.actor,
		createdAt: event.created_at,
		id: `event:${event.id}`,
		path: event.path,
		source: "event",
		type: event.type,
		version: event.version,
	};
}

function compareActivityItems(
	left: WorkspaceActivityItem,
	right: WorkspaceActivityItem
): number {
	const timeDifference = right.createdAt.localeCompare(left.createdAt);
	return timeDifference || left.id.localeCompare(right.id);
}
