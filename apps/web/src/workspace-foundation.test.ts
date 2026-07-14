import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorkspaceFiles } from "./workspace-create";
import { DRAFT_EXPIRY_MS, isDraftExpired } from "./workspace-drafts";
import {
	focusActionForOverview,
	groupWorkspaceFiles,
	resolveConflictState,
} from "./workspace-product";
import { workspaceHref } from "./workspace-utils";

const READY_STATE_PATTERN = /state: ready/u;
const NULL_OWNER_PATTERN = /owner: null/u;

test("guided templates compile to valid product preset files", () => {
	assert.deepEqual(
		createWorkspaceFiles({
			purpose: "Ship the release.",
			template: "delivery",
			title: "Launch",
		}).map((file) => file.path),
		["README.md", "STATUS.md", "tasks/START-001.md"]
	);
	const reviewFiles = createWorkspaceFiles({
		purpose: "Review the evidence.",
		template: "review",
		title: "Investigation",
	});
	assert.deepEqual(
		reviewFiles.map((file) => file.path),
		["README.md", "STATUS.md", "tasks/REVIEW-001.md", "evidence/README.md"]
	);
	const [, , reviewTask] = reviewFiles;
	assert.ok(reviewTask);
	assert.match(reviewTask.content, READY_STATE_PATTERN);
	assert.match(reviewTask.content, NULL_OWNER_PATTERN);
});

test("focus priority is invalid then blocked then review then active then ready", () => {
	const tasks = [
		{ path: "tasks/ready.md", state: "ready", title: "Ready", valid: true },
		{ path: "tasks/active.md", state: "working", title: "Active", valid: true },
		{ path: "tasks/review.md", state: "review", title: "Review", valid: true },
		{
			path: "tasks/blocked.md",
			state: "blocked",
			title: "Blocked",
			valid: true,
		},
		{ path: "tasks/invalid.md", state: null, title: null, valid: false },
	];
	assert.equal(
		focusActionForOverview({
			comments: { unresolved: 2 },
			tasks: { items: tasks },
		}).kind,
		"invalid"
	);
	assert.equal(
		focusActionForOverview({
			comments: { unresolved: 2 },
			tasks: { items: tasks.slice(0, -1) },
		}).kind,
		"blocked"
	);
});

test("files group into product-oriented navigation in stable order", () => {
	const groups = groupWorkspaceFiles([
		{ path: "notes.md" },
		{ path: "evidence/source.md" },
		{ path: "tasks/T-1.md" },
		{ path: "README.md" },
		{ path: "decisions/001.md" },
	]);
	assert.deepEqual(
		groups.map((group) => group.name),
		["Overview", "Tasks", "Evidence", "Decisions and logs", "Other"]
	);
});

test("workspace URLs preserve capabilities and addressable inspectors only", () => {
	assert.equal(
		workspaceHref({
			panel: "comments",
			path: "/w/ws/files/README.md",
			search: "?edit=secret&panel=history&draft=never",
		}),
		"/w/ws/files/README.md?edit=secret&panel=comments"
	);
	assert.equal(
		workspaceHref({
			path: "/w/ws/work",
			search: "?k=read-token&unsaved=content",
		}),
		"/w/ws/work?k=read-token"
	);
});

test("local drafts expire after seven days", () => {
	const now = Date.parse("2026-07-14T12:00:00.000Z");
	const draft = {
		baseVersion: 1,
		content: "local",
		path: "README.md",
		updatedAt: new Date(now - DRAFT_EXPIRY_MS).toISOString(),
		workspaceId: "ws",
	};
	assert.equal(isDraftExpired(draft, now), true);
	assert.equal(
		isDraftExpired(
			{
				...draft,
				updatedAt: new Date(now - DRAFT_EXPIRY_MS + 1).toISOString(),
			},
			now
		),
		false
	);
});

test("conflict choices always advance the baseline without losing the local draft", () => {
	assert.deepEqual(
		resolveConflictState({
			choice: "edit-merged",
			localContent: "my draft",
			remoteContent: "latest",
			remoteVersion: 4,
		}),
		{ baseVersion: 4, content: "my draft", mode: "edit" }
	);
	assert.deepEqual(
		resolveConflictState({
			choice: "use-latest",
			localContent: "my draft",
			remoteContent: "latest",
			remoteVersion: 4,
		}),
		{ baseVersion: 4, content: "latest", mode: "preview" }
	);
});
