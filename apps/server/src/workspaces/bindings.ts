import { createDbFromD1, type MdsyncDb } from "@mdsync/db/client";

export interface WorkspaceBindings {
	DB: D1Database;
	FILES: R2Bucket;
	WEB_ORIGIN?: string | null;
}

let runtimeBindings: WorkspaceBindings | null = null;
let testBindings: WorkspaceBindings | null = null;
let cachedDb: {
	bindings: WorkspaceBindings;
	db: MdsyncDb;
} | null = null;

export function workspaceBindings(): WorkspaceBindings {
	const bindings = testBindings ?? runtimeBindings;
	if (!bindings) {
		throw new Error("Workspace bindings are not configured.");
	}
	return bindings;
}

export function workspaceDb(): MdsyncDb {
	const bindings = workspaceBindings();
	if (cachedDb?.bindings === bindings) {
		return cachedDb.db;
	}
	const db = createDbFromD1(bindings.DB);
	cachedDb = { bindings, db };
	return db;
}

export function setWorkspaceBindings(bindings: WorkspaceBindings) {
	runtimeBindings = bindings;
	cachedDb = null;
}

export function setWorkspaceBindingsForTest(
	bindings: WorkspaceBindings | null
) {
	testBindings = bindings;
	cachedDb = null;
}
