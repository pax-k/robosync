import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";

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

export type MdsyncDb = DrizzleD1Database<typeof dbSchema> & {
	$client: D1Database;
};

export function createDbFromD1(database: D1Database): MdsyncDb {
	return drizzle(database, { schema: dbSchema });
}
