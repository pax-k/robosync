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
	workspaceFiles,
	workspaceFilesRelations,
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
	workspaceFiles,
	workspaceFilesRelations,
	workspaces,
	workspacesRelations,
};

export function createDb() {
	return drizzle(env.DB, { schema });
}
