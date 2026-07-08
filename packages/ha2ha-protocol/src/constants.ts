export const HA2HA_PROTOCOL = {
	displayName: "HA2HA",
	fullName: "Human-Agent to Human-Agent Protocol",
	name: "ha2ha",
	version: "1.0.0",
} as const;

export const HA2HA_FILENAMES = {
	manifestMarkdown: "HA2HA.md",
	status: "STATUS.md",
	workspaceManifest: "workspace.json",
} as const;

export const HA2HA_DIRECTORIES = {
	decisions: "decisions",
	evidence: "evidence",
	logs: "logs",
	metadata: ".ha2ha",
	participants: "participants",
	tasks: "tasks",
} as const;

export const HA2HA_PATHS = {
	decisions: `${HA2HA_DIRECTORIES.decisions}/`,
	evidence: `${HA2HA_DIRECTORIES.evidence}/`,
	logs: `${HA2HA_DIRECTORIES.logs}/`,
	manifestMarkdown: HA2HA_FILENAMES.manifestMarkdown,
	participants: `${HA2HA_DIRECTORIES.participants}/`,
	status: HA2HA_FILENAMES.status,
	tasks: `${HA2HA_DIRECTORIES.tasks}/`,
	workspaceManifest: `${HA2HA_DIRECTORIES.metadata}/${HA2HA_FILENAMES.workspaceManifest}`,
} as const;

export const HA2HA_TASK_STATES = [
	"ready",
	"claimed",
	"working",
	"blocked",
	"review",
	"done",
	"abandoned",
] as const;

export const HA2HA_CAPABILITIES = {
	events: "events",
	fileHistory: "file-history",
	fileWrite: "file-write",
	importExportPreservation: "import-export-preservation",
	rawRead: "raw-read",
} as const;

export const HA2HA_ACTOR_FIELDS = {
	actor: "actor",
	deletedBy: "deletedBy",
	updatedBy: "updatedBy",
	updatedByFrontmatter: "updated_by",
} as const;

export const HA2HA_TARGET_COORDINATE_FIELDS = {
	path: "path",
	version: "version",
	workspaceId: "workspaceId",
} as const;

export const HA2HA_TASK_FIELDS = {
	evidence: "evidence",
	id: "id",
	owner: "owner",
	state: "state",
	title: "title",
	updatedBy: "updated_by",
} as const;

export const HA2HA_EVIDENCE_FIELDS = {
	actor: "actor",
	createdAt: "created_at",
	id: "id",
	kind: "kind",
	result: "result",
	target: "target",
	task: "task",
} as const;

export const HA2HA_EVIDENCE_RESULTS = [
	"pass",
	"fail",
	"skipped",
	"blocked",
	"unknown",
] as const;

export const HA2HA_EVENT_TYPES = {
	evidenceAdded: "evidence.added",
	fileCreated: "file.created",
	fileDeleted: "file.deleted",
	fileUpdated: "file.updated",
	taskClaimed: "task.claimed",
} as const;

export const HA2HA_HEADERS = {
	fileVersion: "X-HA2HA-File-Version",
	path: "X-HA2HA-Path",
} as const;

export const HA2HA_HTTP_ROUTES = {
	events: "/api/workspaces/:workspaceId/events",
	file: "/api/workspaces/:workspaceId/files",
	fileVersion: "/api/workspaces/:workspaceId/files/versions/:version",
	fileVersions: "/api/workspaces/:workspaceId/files/versions",
	rawEvents: "/w/:workspaceId/raw/events",
	rawFile: "/w/:workspaceId/raw/:path",
	rawListing: "/w/:workspaceId/raw",
	tree: "/api/workspaces/:workspaceId/tree",
} as const;

export const HA2HA_CONFLICT = {
	error: "version_conflict",
	message: "File changed since baseVersion.",
} as const;

export const HA2HA_CONFLICT_FIELDS = {
	content: "content",
	contentType: "contentType",
	error: "error",
	latest: "latest",
	message: "message",
	updatedAt: "updatedAt",
	updatedBy: "updatedBy",
} as const;

export const HA2HA_WORKSPACE_MANIFEST_FIELDS = {
	capabilities: "capabilities",
	conflictPolicy: "conflictPolicy",
	paths: "paths",
	protocol: "protocol",
	protocolVersion: "protocolVersion",
	routes: "routes",
	schemaVersions: "schemaVersions",
	title: "title",
	workspaceId: "workspaceId",
} as const;

export const HA2HA_CONFLICT_POLICIES = {
	baseVersionRequired: "baseVersion-required",
} as const;

export type Ha2haTaskState = (typeof HA2HA_TASK_STATES)[number];
export type Ha2haCapability =
	(typeof HA2HA_CAPABILITIES)[keyof typeof HA2HA_CAPABILITIES];
export type Ha2haEvidenceResult = (typeof HA2HA_EVIDENCE_RESULTS)[number];
export type Ha2haEventType =
	(typeof HA2HA_EVENT_TYPES)[keyof typeof HA2HA_EVENT_TYPES];

export interface Ha2haTargetCoordinate {
	path: string;
	version: number;
	workspaceId: string;
}
