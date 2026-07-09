import { env } from "@mdsync/env/server";
import { drizzle } from "drizzle-orm/d1";

import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from "./schema/auth";
import {
	comments,
	commentsRelations,
	workspaceAdminEvents,
	workspaceAdminEventsRelations,
	workspaceEvents,
	workspaceEventsRelations,
	workspaceFiles,
	workspaceFilesRelations,
	workspaceFileVersions,
	workspaceFileVersionsRelations,
	workspaces,
	workspacesRelations,
} from "./schema/workspaces";

export const dbSchema = {
	account,
	accountRelations,
	comments,
	commentsRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
	workspaceAdminEvents,
	workspaceAdminEventsRelations,
	workspaceEvents,
	workspaceEventsRelations,
	workspaceFiles,
	workspaceFilesRelations,
	workspaceFileVersions,
	workspaceFileVersionsRelations,
	workspaces,
	workspacesRelations,
};

export function createDb() {
	return drizzle(env.DB, { schema: dbSchema });
}
