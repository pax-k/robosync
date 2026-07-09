export type AccessMode = "public" | "token";
export type WriteAccessMode = "none" | "public" | "token";
export type ViewMode =
	| "activity"
	| "admin"
	| "comments"
	| "edit"
	| "history"
	| "preview";

export interface WorkspaceFile {
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
}

export interface WorkspaceMetadata {
	createdAt: string;
	id: string;
	readAccess: AccessMode;
	title: string | null;
	updatedAt: string;
	writeAccess: WriteAccessMode;
}

export interface WorkspaceFilePayload {
	content: string;
	contentType: string;
	path: string;
	updatedAt: string;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

export interface WorkspaceFileVersionMetadata {
	contentType: string;
	createdAt: string;
	path: string;
	sha256: string | null;
	sizeBytes: number;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

export interface HistoricalWorkspaceFilePayload
	extends WorkspaceFileVersionMetadata {
	content: string;
}

export interface WorkspaceComment {
	anchor: {
		heading?: string;
		line?: number;
	};
	authorId: string | null;
	body: string;
	createdAt: string;
	id: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt: string;
	version: number;
	workspaceId: string;
}

export type CapabilityKind = "edit" | "read";

export interface WorkspaceCapabilityState {
	access: AccessMode | WriteAccessMode;
	canRevoke: boolean;
	canRotate: boolean;
	tokenActive: boolean;
}

export interface WorkspaceCapabilities {
	edit: WorkspaceCapabilityState;
	read: WorkspaceCapabilityState;
}

export interface CapabilityLinks {
	editUrl?: string;
	rawUrl?: string;
	workspaceUrl?: string;
}

export interface WorkspaceCapabilitiesPayload {
	capabilities: WorkspaceCapabilities;
	workspaceId: string;
}

export interface CapabilityMutationPayload
	extends WorkspaceCapabilitiesPayload {
	capability: CapabilityKind;
	links?: CapabilityLinks;
	revoked?: boolean;
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
		recent: WorkspaceAdminEvent[];
		total: number;
	};
	events: {
		byType: WorkspaceNamedCount[];
		recent: WorkspaceProtocolEventSummary[];
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
		byState: WorkspaceNamedCount[];
		files: Array<{
			path: string;
			state: string | null;
			version: number;
		}>;
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
		readAccess: AccessMode;
		title: string | null;
		totalSizeBytes: number;
		updatedAt: string;
		writeAccess: WriteAccessMode;
	};
	workspaceId: string;
}

export interface WorkspaceRetentionPolicy {
	retention: {
		coverage: string[];
		perWorkspaceD1: {
			status: string;
		};
		status: string;
	};
	workspaceId: string;
}

export interface WorkspaceNamedCount {
	count: number;
	name: string;
}

export interface WorkspaceAdminEvent {
	actor: string | null;
	createdAt: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
}

export interface WorkspaceProtocolEventSummary extends WorkspaceAdminEvent {
	version: number | null;
}

export interface CreateWorkspaceResponse {
	editUrl?: string;
	id: string;
	rawUrl: string;
	workspaceUrl: string;
}

export interface VersionConflictResponse {
	error: "version_conflict";
	latest: WorkspaceFilePayload | null;
	message: string;
}
