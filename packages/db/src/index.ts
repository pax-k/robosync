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
	workspaceEvents,
	workspaceEventsRelations,
	workspaceFiles,
	workspaceFilesRelations,
	workspaceFileVersions,
	workspaceFileVersionsRelations,
	workspaces,
	workspacesRelations,
} from "./schema/workspaces";

const schema = {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
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
	return drizzle(env.DB, { schema });
}
