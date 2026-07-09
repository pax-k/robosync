import assert from "node:assert/strict";
import { test } from "node:test";

import { createDbFromD1, dbSchema } from "./client";

test("createDb schema export includes workspace comments and admin events", () => {
	assert.ok(dbSchema.comments);
	assert.ok(dbSchema.commentsRelations);
	assert.ok(dbSchema.workspaceAdminEvents);
	assert.ok(dbSchema.workspaceAdminEventsRelations);
});

test("createDbFromD1 creates a Node-safe Drizzle client from injected D1", () => {
	const database = {
		batch: () => {
			throw new Error("D1 batch was not expected.");
		},
		prepare: () => {
			throw new Error("D1 prepare was not expected.");
		},
	} as unknown as D1Database;

	const db = createDbFromD1(database);

	assert.equal(db.$client, database);
	assert.ok(db.query.workspaces);
});
