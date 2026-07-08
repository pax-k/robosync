import { workspaceBindings } from "./bindings";
import {
	contentSizeBytes,
	createObjectKey,
	type ReadAccess,
	sha256Hex,
	type UploadedObject,
	WorkspaceError,
	type WriteAccess,
} from "./domain";

export interface WorkspaceRow {
	created_at: string;
	file_count: number;
	id: string;
	last_accessed_at: string | null;
	r2_prefix: string;
	read_access: ReadAccess;
	read_token_hash: string | null;
	title: string | null;
	total_size_bytes: number;
	updated_at: string;
	write_access: WriteAccess;
	write_token_hash: string | null;
}

export interface WorkspaceFileRow {
	content_type: string;
	created_at: string;
	object_key: string;
	path: string;
	sha256: string | null;
	size_bytes: number;
	updated_at: string;
	updated_by: string | null;
	version: number;
	workspace_id: string;
}

export interface WorkspaceEventRow {
	actor: string | null;
	created_at: string;
	id: string;
	path: string | null;
	payload: string;
	type: string;
	version: number | null;
	workspace_id: string;
}

export interface WorkspaceFileVersionRow {
	content_type: string;
	created_at: string;
	object_key: string;
	path: string;
	sha256: string | null;
	size_bytes: number;
	updated_by: string | null;
	version: number;
	workspace_id: string;
}

export interface WorkspaceCommentRow {
	anchor_json: string;
	author_id: string | null;
	body: string;
	created_at: string;
	id: string;
	path: string;
	resolved_at: string | null;
	resolved_by: string | null;
	updated_at: string;
	version: number;
	workspace_id: string;
}

export interface WorkspaceAdminEventRow {
	actor: string | null;
	created_at: string;
	id: string;
	path: string | null;
	payload: string;
	type: string;
	workspace_id: string;
}

export interface WorkspaceTreeFile {
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
}

export interface WorkspaceAdminStats {
	cleanup: {
		failedJobs: number;
		latestFailureAt: string | null;
		orphanedObjects: {
			count: number | null;
			status: "not_scanned";
		};
	};
	comments: {
		resolved: number;
		staleAnchors: number;
		total: number;
		unresolved: number;
	};
	conflicts: {
		recent: WorkspaceAdminStatsEvent[];
		total: number;
	};
	events: {
		byType: WorkspaceAdminStatsCount[];
		recent: WorkspaceAdminStatsProtocolEvent[];
		total: number;
	};
	files: {
		currentCount: number;
		latestUpdatedAt: string | null;
		totalSizeBytes: number;
	};
	generatedAt: string;
	health: {
		issues: string[];
		status: "attention" | "healthy";
	};
	retention: {
		coverage: string[];
		status: "not_configured";
	};
	storage: {
		activeBytes: number;
		currentFileRecords: number;
		indexedObjects: number;
		r2Prefix: string;
		versionBytes: number;
		versionRecords: number;
	};
	tasks: {
		byState: WorkspaceAdminStatsCount[];
		files: WorkspaceAdminStatsTaskFile[];
		missingState: number;
		total: number;
	};
	versions: {
		pathsWithHistory: number;
		totalCount: number;
	};
	workspace: {
		createdAt: string;
		fileCount: number;
		id: string;
		lastAccessedAt: string | null;
		readAccess: ReadAccess;
		title: string | null;
		totalSizeBytes: number;
		updatedAt: string;
		writeAccess: WriteAccess;
	};
	workspaceId: string;
}

export interface WorkspaceAdminStatsCount {
	count: number;
	name: string;
}

export interface WorkspaceAdminStatsEvent {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
}

export interface WorkspaceAdminStatsProtocolEvent
	extends WorkspaceAdminStatsEvent {
	version: number | null;
}

export interface WorkspaceAdminStatsTaskFile {
	path: string;
	state: string | null;
	version: number;
}

const CLEANUP_FAILED_EVENT_TYPE = "cleanup.failed";
const VERSION_CONFLICT_EVENT_TYPE = "file.version_conflict";
const RECENT_ADMIN_EVENT_LIMIT = 5;
const RECENT_PROTOCOL_EVENT_LIMIT = 5;
const TASK_FILE_PATH_PATTERN = /^tasks\/.+\.md$/;
const FRONTMATTER_BOUNDARY = "---";
const FRONTMATTER_STATE_PATTERN = /^state:\s*(.+?)\s*$/;
const LINE_BREAK_PATTERN = /\r?\n/;

export async function deleteObjectBestEffort(objectKey: string) {
	try {
		await workspaceBindings().FILES.delete(objectKey);
	} catch {
		// Cleanup is best-effort; callers preserve the canonical D1 state.
	}
}

export function fetchObjectText(file: WorkspaceFileRow) {
	return fetchObjectTextByKey(file.object_key);
}

export async function fetchObjectTextByKey(objectKey: string) {
	const object = await workspaceBindings().FILES.get(objectKey);
	if (!object) {
		throw new WorkspaceError(
			500,
			"missing_object",
			"File metadata exists but object storage is missing content."
		);
	}
	return object.text();
}

export function getWorkspaceFileVersion({
	path,
	version,
	workspaceId,
}: {
	path: string;
	version: number;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
     from workspace_file_versions
     where workspace_id = ? and path = ? and version = ?`
		)
		.bind(workspaceId, path, version)
		.first<WorkspaceFileVersionRow>();
}

export function getFile(workspaceId: string, path: string) {
	return workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, object_key, content_type, size_bytes, sha256, version, updated_by, created_at, updated_at
     from workspace_files
     where workspace_id = ? and path = ?`
		)
		.bind(workspaceId, path)
		.first<WorkspaceFileRow>();
}

export function getWorkspace(id: string) {
	return workspaceBindings()
		.DB.prepare(
			`select id, title, read_access, write_access, read_token_hash, write_token_hash, r2_prefix, file_count, total_size_bytes, created_at, updated_at, last_accessed_at
     from workspaces
     where id = ?`
		)
		.bind(id)
		.first<WorkspaceRow>();
}

export async function listWorkspaceFiles(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select path, content_type, version, updated_by, updated_at
     from workspace_files
     where workspace_id = ?
     order by path asc`
		)
		.bind(workspaceId)
		.all<{
			content_type: string;
			path: string;
			updated_at: string;
			updated_by: string | null;
			version: number;
		}>();

	return results.map(
		(row): WorkspaceTreeFile => ({
			contentType: row.content_type,
			path: row.path,
			updatedAt: row.updated_at,
			updatedBy: row.updated_by,
			version: row.version,
		})
	);
}

export async function getWorkspaceAdminStats(
	workspace: WorkspaceRow
): Promise<WorkspaceAdminStats> {
	const [files, versions, events, comments, adminEvents] = await Promise.all([
		listWorkspaceFilesDetailed(workspace.id),
		listAllWorkspaceFileVersions(workspace.id),
		listWorkspaceEvents(workspace.id),
		listWorkspaceComments({ workspaceId: workspace.id }),
		listWorkspaceAdminEvents(workspace.id),
	]);
	const taskStats = await buildTaskStats(files);
	const activeBytes = sumBy(files, (file) => file.size_bytes);
	const versionBytes = sumBy(versions, (version) => version.size_bytes);
	const currentObjectKeys = new Set(files.map((file) => file.object_key));
	const versionObjectKeys = new Set(
		versions.map((version) => version.object_key)
	);
	const indexedObjects = new Set([...currentObjectKeys, ...versionObjectKeys]);
	const latestUpdatedAt = maxIsoDate(files.map((file) => file.updated_at));
	const pathsWithHistory = new Set(
		versions
			.filter((version) => version.version > 1)
			.map((version) => version.path)
	).size;
	const currentVersionByPath = new Map(
		files.map((file) => [file.path, file.version] as const)
	);
	const staleAnchors = comments.filter((comment) => {
		const currentVersion = currentVersionByPath.get(comment.path);
		return (
			!comment.resolved_at &&
			currentVersion !== undefined &&
			comment.version < currentVersion
		);
	}).length;
	const unresolvedComments = comments.filter(
		(comment) => !comment.resolved_at
	).length;
	const conflictEvents = adminEvents.filter(
		(event) => event.type === VERSION_CONFLICT_EVENT_TYPE
	);
	const cleanupFailures = adminEvents.filter(
		(event) => event.type === CLEANUP_FAILED_EVENT_TYPE
	);
	const issues = workspaceHealthIssues({
		activeBytes,
		cleanupFailureCount: cleanupFailures.length,
		conflictCount: conflictEvents.length,
		currentFileCount: files.length,
		missingTaskState: taskStats.missingState,
		staleAnchors,
		workspace,
	});

	return {
		cleanup: {
			failedJobs: cleanupFailures.length,
			latestFailureAt: maxIsoDate(
				cleanupFailures.map((event) => event.created_at)
			),
			orphanedObjects: {
				count: null,
				status: "not_scanned",
			},
		},
		comments: {
			resolved: comments.length - unresolvedComments,
			staleAnchors,
			total: comments.length,
			unresolved: unresolvedComments,
		},
		conflicts: {
			recent: serializeRecentAdminEvents(conflictEvents),
			total: conflictEvents.length,
		},
		events: {
			byType: countBy(events, (event) => event.type),
			recent: serializeRecentProtocolEvents(events),
			total: events.length,
		},
		files: {
			currentCount: files.length,
			latestUpdatedAt,
			totalSizeBytes: activeBytes,
		},
		generatedAt: new Date().toISOString(),
		health: {
			issues,
			status: issues.length === 0 ? "healthy" : "attention",
		},
		retention: {
			coverage: [
				"workspaces",
				"file versions",
				"protocol events",
				"comments",
				"admin events",
				"orphaned objects",
			],
			status: "not_configured",
		},
		storage: {
			activeBytes,
			currentFileRecords: files.length,
			indexedObjects: indexedObjects.size,
			r2Prefix: workspace.r2_prefix,
			versionBytes,
			versionRecords: versions.length,
		},
		tasks: taskStats,
		versions: {
			pathsWithHistory,
			totalCount: versions.length,
		},
		workspace: {
			createdAt: workspace.created_at,
			fileCount: workspace.file_count,
			id: workspace.id,
			lastAccessedAt: workspace.last_accessed_at,
			readAccess: workspace.read_access,
			title: workspace.title,
			totalSizeBytes: workspace.total_size_bytes,
			updatedAt: workspace.updated_at,
			writeAccess: workspace.write_access,
		},
		workspaceId: workspace.id,
	};
}

export async function listWorkspaceEvents(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select id, workspace_id, type, path, version, actor, created_at, payload
     from workspace_events
     where workspace_id = ?
     order by created_at asc, id asc`
		)
		.bind(workspaceId)
		.all<WorkspaceEventRow>();

	return results;
}

export async function recordWorkspaceAdminEvent({
	actor,
	path,
	payload,
	type,
	workspaceId,
}: {
	actor: string | null;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
	workspaceId: string;
}) {
	await workspaceBindings()
		.DB.prepare(
			`insert into workspace_admin_events (
       id, workspace_id, type, path, actor, payload, created_at
     ) values (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			workspaceId,
			type,
			path,
			actor,
			JSON.stringify(payload),
			new Date().toISOString()
		)
		.run();
}

export async function listWorkspaceFileVersions(
	workspaceId: string,
	path: string
) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
     from workspace_file_versions
     where workspace_id = ? and path = ?
     order by version asc`
		)
		.bind(workspaceId, path)
		.all<WorkspaceFileVersionRow>();

	return results;
}

export async function listWorkspaceFilesDetailed(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, object_key, content_type, size_bytes, sha256, version, updated_by, created_at, updated_at
     from workspace_files
     where workspace_id = ?
     order by path asc`
		)
		.bind(workspaceId)
		.all<WorkspaceFileRow>();

	return results;
}

export async function listAllWorkspaceFileVersions(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select workspace_id, path, version, object_key, content_type, size_bytes, sha256, updated_by, created_at
     from workspace_file_versions
     where workspace_id = ?
     order by path asc, version asc`
		)
		.bind(workspaceId)
		.all<WorkspaceFileVersionRow>();

	return results;
}

export async function listWorkspaceComments({
	path,
	workspaceId,
}: {
	path?: string;
	workspaceId: string;
}) {
	const baseQuery = `select id, workspace_id, path, version, anchor_json, body, author_id, created_at, updated_at, resolved_at, resolved_by
     from comments
     where workspace_id = ?`;
	const pathClause = path ? " and path = ?" : "";
	const orderClause = " order by created_at asc, id asc";
	const statement = workspaceBindings()
		.DB.prepare(`${baseQuery}${pathClause}${orderClause}`)
		.bind(...(path ? [workspaceId, path] : [workspaceId]));
	const { results } = await statement.all<WorkspaceCommentRow>();

	return results;
}

export async function listWorkspaceAdminEvents(workspaceId: string) {
	const { results } = await workspaceBindings()
		.DB.prepare(
			`select id, workspace_id, type, path, actor, payload, created_at
     from workspace_admin_events
     where workspace_id = ?
     order by created_at asc, id asc`
		)
		.bind(workspaceId)
		.all<WorkspaceAdminEventRow>();

	return results;
}

export function getWorkspaceComment({
	commentId,
	workspaceId,
}: {
	commentId: string;
	workspaceId: string;
}) {
	return workspaceBindings()
		.DB.prepare(
			`select id, workspace_id, path, version, anchor_json, body, author_id, created_at, updated_at, resolved_at, resolved_by
     from comments
     where workspace_id = ? and id = ?`
		)
		.bind(workspaceId, commentId)
		.first<WorkspaceCommentRow>();
}

export async function putFileObject({
	content,
	contentType,
	path,
	workspaceId,
}: {
	content: string;
	contentType: string;
	path: string;
	workspaceId: string;
}): Promise<UploadedObject> {
	const objectKey = createObjectKey(workspaceId);
	const sha256 = await sha256Hex(content);
	const sizeBytes = contentSizeBytes(content);

	await workspaceBindings().FILES.put(objectKey, content, {
		customMetadata: {
			path,
			sha256,
			workspaceId,
		},
		httpMetadata: {
			contentType,
		},
	});

	return {
		contentType,
		objectKey,
		path,
		sha256,
		sizeBytes,
	};
}

export async function readObjectBody(file: WorkspaceFileRow) {
	const object = await workspaceBindings().FILES.get(file.object_key);
	if (!object) {
		throw new WorkspaceError(
			500,
			"missing_object",
			"File metadata exists but object storage is missing content."
		);
	}
	return object.body;
}

async function buildTaskStats(
	files: WorkspaceFileRow[]
): Promise<WorkspaceAdminStats["tasks"]> {
	const taskFiles = files.filter((file) =>
		TASK_FILE_PATH_PATTERN.test(file.path)
	);
	const taskContents = await Promise.all(
		taskFiles.map(async (file) => ({
			content: await fetchObjectText(file),
			file,
		}))
	);
	const taskSummaries: WorkspaceAdminStatsTaskFile[] = [];
	const stateCounts = new Map<string, number>();
	let missingState = 0;

	for (const { content, file } of taskContents) {
		const state = parseTaskState(content);
		if (state) {
			stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
		} else {
			missingState += 1;
		}
		taskSummaries.push({
			path: file.path,
			state,
			version: file.version,
		});
	}

	return {
		byState: mapCounts(stateCounts),
		files: taskSummaries,
		missingState,
		total: taskFiles.length,
	};
}

function countBy<T>(
	items: T[],
	getName: (item: T) => string
): WorkspaceAdminStatsCount[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const name = getName(item);
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return mapCounts(counts);
}

function mapCounts(counts: Map<string, number>): WorkspaceAdminStatsCount[] {
	return [...counts.entries()]
		.map(([name, count]) => ({ count, name }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function maxIsoDate(values: Array<string | null>) {
	const dates = values.filter((value): value is string => Boolean(value));
	if (dates.length === 0) {
		return null;
	}
	return dates.sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function parseTaskState(content: string) {
	const lines = content.split(LINE_BREAK_PATTERN);
	if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
		return null;
	}

	for (const line of lines.slice(1)) {
		const trimmed = line.trim();
		if (trimmed === FRONTMATTER_BOUNDARY) {
			return null;
		}
		const match = trimmed.match(FRONTMATTER_STATE_PATTERN);
		if (match?.[1]) {
			return match[1].trim().replace(/^["']|["']$/g, "");
		}
	}

	return null;
}

function parseJsonObject(payload: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(payload);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function serializeRecentAdminEvents(
	events: WorkspaceAdminEventRow[]
): WorkspaceAdminStatsEvent[] {
	return [...events]
		.sort((left, right) => right.created_at.localeCompare(left.created_at))
		.slice(0, RECENT_ADMIN_EVENT_LIMIT)
		.map((event) => ({
			actor: event.actor,
			createdAt: event.created_at,
			path: event.path,
			payload: parseJsonObject(event.payload),
			type: event.type,
		}));
}

function serializeRecentProtocolEvents(
	events: WorkspaceEventRow[]
): WorkspaceAdminStatsProtocolEvent[] {
	return [...events]
		.sort((left, right) => right.created_at.localeCompare(left.created_at))
		.slice(0, RECENT_PROTOCOL_EVENT_LIMIT)
		.map((event) => ({
			actor: event.actor,
			createdAt: event.created_at,
			path: event.path,
			payload: parseJsonObject(event.payload),
			type: event.type,
			version: event.version,
		}));
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
	let total = 0;
	for (const item of items) {
		total += getValue(item);
	}
	return total;
}

function workspaceHealthIssues({
	activeBytes,
	cleanupFailureCount,
	conflictCount,
	currentFileCount,
	missingTaskState,
	staleAnchors,
	workspace,
}: {
	activeBytes: number;
	cleanupFailureCount: number;
	conflictCount: number;
	currentFileCount: number;
	missingTaskState: number;
	staleAnchors: number;
	workspace: WorkspaceRow;
}) {
	const issues: string[] = [];
	if (workspace.file_count !== currentFileCount) {
		issues.push("Workspace file count does not match current file records.");
	}
	if (workspace.total_size_bytes !== activeBytes) {
		issues.push("Workspace byte total does not match current file records.");
	}
	if (conflictCount > 0) {
		issues.push("Version conflicts were observed for this workspace.");
	}
	if (staleAnchors > 0) {
		issues.push("Unresolved comments are anchored to older file versions.");
	}
	if (cleanupFailureCount > 0) {
		issues.push("Cleanup failures need operator review.");
	}
	if (missingTaskState > 0) {
		issues.push("Some task files do not declare a state.");
	}
	return issues;
}
