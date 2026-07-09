import type { ReadAccess, WriteAccess } from "../domain";

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
