import assert from "node:assert/strict";
import { test } from "node:test";

import {
	buildLineDiff,
	createRestoreDraft,
	filterWorkspaceEvents,
	groupActivityByDay,
	type WorkspaceEvent,
} from "./workspace-product";

test("filterWorkspaceEvents filters by path actor type and time without mutating protocol events", () => {
	const oldEvent = workspaceEvent({
		actor: "workspace-create",
		createdAt: "2026-07-06T12:00:00.000Z",
		id: "event-old",
		path: "TODO.md",
		type: "file.created",
		version: 1,
	});
	const recentEvent = workspaceEvent({
		actor: "agent-context-b",
		createdAt: "2026-07-08T12:00:00.000Z",
		id: "event-recent",
		path: "README.md",
		type: "file.updated",
		version: 2,
	});
	const events = [oldEvent, recentEvent];
	const originalEvents = structuredClone(events);

	const filtered = filterWorkspaceEvents({
		events,
		filters: {
			actor: "agent",
			path: "readme",
			time: "day",
			type: "file.updated",
		},
		now: new Date("2026-07-08T13:00:00.000Z"),
	});

	assert.deepEqual(filtered, [recentEvent]);
	assert.equal(filtered[0], recentEvent);
	assert.deepEqual(events, originalEvents);
});

test("groupActivityByDay groups product activity newest first", () => {
	const first = workspaceEvent({
		createdAt: "2026-07-07T12:00:00.000Z",
		id: "event-1",
	});
	const second = workspaceEvent({
		createdAt: "2026-07-08T10:00:00.000Z",
		id: "event-2",
	});
	const third = workspaceEvent({
		createdAt: "2026-07-08T11:00:00.000Z",
		id: "event-3",
	});

	const groups = groupActivityByDay([first, second, third]);

	assert.deepEqual(
		groups.map((group) => ({
			dateKey: group.dateKey,
			eventIds: group.events.map((event) => event.id),
		})),
		[
			{ dateKey: "2026-07-08", eventIds: ["event-3", "event-2"] },
			{ dateKey: "2026-07-07", eventIds: ["event-1"] },
		]
	);
});

test("buildLineDiff produces stable added removed and unchanged rows", () => {
	const diff = buildLineDiff("alpha\nbeta\ngamma\n", "alpha\nbeta v2\ngamma\n");

	assert.deepEqual(
		diff.map((line) => ({
			content: line.content,
			kind: line.kind,
			nextLineNumber: line.nextLineNumber,
			previousLineNumber: line.previousLineNumber,
		})),
		[
			{
				content: "alpha",
				kind: "unchanged",
				nextLineNumber: 1,
				previousLineNumber: 1,
			},
			{
				content: "beta",
				kind: "removed",
				nextLineNumber: null,
				previousLineNumber: 2,
			},
			{
				content: "beta v2",
				kind: "added",
				nextLineNumber: 2,
				previousLineNumber: null,
			},
			{
				content: "gamma",
				kind: "unchanged",
				nextLineNumber: 3,
				previousLineNumber: 3,
			},
		]
	);
});

test("createRestoreDraft writes historical content as a new current version", () => {
	assert.deepEqual(
		createRestoreDraft({
			contentType: "text/markdown; charset=utf-8",
			currentVersion: 4,
			historicalContent: "# Earlier\n",
			path: "README.md",
			restoreActor: "web",
		}),
		{
			actor: "web",
			baseVersion: 4,
			content: "# Earlier\n",
			contentType: "text/markdown; charset=utf-8",
			path: "README.md",
		}
	);
});

function workspaceEvent(
	overrides: Partial<WorkspaceEvent> = {}
): WorkspaceEvent {
	return {
		actor: "workspace-create",
		createdAt: "2026-07-08T00:00:00.000Z",
		id: "event",
		path: "README.md",
		payload: {},
		type: "file.created",
		version: 1,
		workspaceId: "ws-test",
		...overrides,
	};
}
