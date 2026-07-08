export interface WorkspaceBindings {
	DB: D1Database;
	FILES: R2Bucket;
	WEB_ORIGIN?: string | null;
}

let runtimeBindings: WorkspaceBindings | null = null;
let testBindings: WorkspaceBindings | null = null;

export function workspaceBindings(): WorkspaceBindings {
	const bindings = testBindings ?? runtimeBindings;
	if (!bindings) {
		throw new Error("Workspace bindings are not configured.");
	}
	return bindings;
}

export function setWorkspaceBindings(bindings: WorkspaceBindings) {
	runtimeBindings = bindings;
}

export function setWorkspaceBindingsForTest(
	bindings: WorkspaceBindings | null
) {
	testBindings = bindings;
}
