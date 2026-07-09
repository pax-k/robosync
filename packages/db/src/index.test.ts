import assert from "node:assert/strict";
import { test } from "node:test";

import { dbSchema } from "./index";

test("createDb schema export includes workspace comments and admin events", () => {
	assert.ok(dbSchema.comments);
	assert.ok(dbSchema.commentsRelations);
	assert.ok(dbSchema.workspaceAdminEvents);
	assert.ok(dbSchema.workspaceAdminEventsRelations);
});
