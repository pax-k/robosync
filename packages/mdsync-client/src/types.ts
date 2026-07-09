import type { Ha2haClient } from "@ha2ha/client";

export type MdsyncClientErrorCode =
	| "comment_anchor_not_found"
	| "comment_not_found"
	| "file_not_found"
	| "invalid_request"
	| "invalid_retention_cutoff"
	| "invalid_token"
	| "missing_token"
	| "not_found"
	| "transport_error"
	| "unsupported_operation"
	| "validation_error"
	| "version_conflict"
	| "workspace_not_found"
	| "write_disabled";

export interface MdsyncClientError {
	code: MdsyncClientErrorCode;
	latest?: MdsyncFile | null;
	message: string;
	status?: number;
}

export type MdsyncResult<Data> =
	| { data: Data; ok: true }
	| { error: MdsyncClientError; ok: false };

export type MdsyncAuth =
	| { kind: "bearer"; token: string }
	| { kind: "edit-token"; token: string }
	| { kind: "none" }
	| { kind: "read-token"; token: string };

export interface CreateMdsyncClientOptions {
	actor?: string;
	apiOrigin: string;
	auth?: MdsyncAuth;
	fetch?: typeof fetch;
	workspaceId?: string;
}

export interface MdsyncWorkspaceFileInput {
	content: string;
	contentType?: string;
	path: string;
}

export interface CreateWorkspaceInput {
	actor?: string;
	files: MdsyncWorkspaceFileInput[];
	readAccess?: "public" | "token";
	title?: string;
	writeAccess?: "none" | "public" | "token";
}

export interface MdsyncCreatedWorkspace {
	createdAt?: string;
	editUrl?: string;
	id: string;
	rawUrl: string;
	title?: string | null;
	workspaceUrl: string;
}

export interface MdsyncWorkspace {
	createdAt?: string;
	id: string;
	readAccess?: "public" | "token";
	title?: string | null;
	updatedAt?: string;
	writeAccess?: "none" | "public" | "token";
}

export interface MdsyncWorkspaceListing {
	files: Array<{ path: string; version?: number }>;
	workspaceId: string;
}

export interface MdsyncFile {
	content: string;
	contentType: string;
	path: string;
	updatedAt?: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface MdsyncWriteFileInput {
	actor?: string;
	baseVersion?: number | null;
	content: string;
	contentType?: string;
	path: string;
}

export interface MdsyncWriteResult {
	path: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface MdsyncDeleteFileInput {
	actor?: string;
	baseVersion: number;
	path: string;
}

export interface MdsyncDeleteResult {
	deleted: true;
	deletedBy?: string | null;
	path: string;
	workspaceId: string;
}

export interface MdsyncWorkspaceEvent {
	actor: string | null;
	createdAt?: string;
	id?: string;
	path: string | null;
	payload?: Record<string, unknown>;
	type: string;
	version: number | null;
	workspaceId: string;
}

export interface MdsyncFileVersion {
	contentType?: string;
	createdAt?: string;
	path: string;
	sha256?: string | null;
	sizeBytes?: number;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface MdsyncCommentSelector {
	heading?: string;
	line?: number;
}

export interface MdsyncComment {
	anchor: Record<string, unknown>;
	authorId: string | null;
	body: string;
	createdAt?: string;
	id: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	updatedAt?: string;
	version: number;
	workspaceId: string;
}

export interface CreateCommentInput {
	actor?: string;
	body: string;
	path: string;
	selector?: MdsyncCommentSelector;
	version: number;
}

export interface ListCommentsInput {
	path?: string;
}

export interface ResolveCommentInput {
	actor?: string;
	commentId: string;
}

export interface MdsyncCapabilities {
	edit: {
		access: string;
		canRevoke: boolean;
		canRotate: boolean;
		tokenActive: boolean;
	};
	read: {
		access: string;
		canRevoke: boolean;
		canRotate: boolean;
		tokenActive: boolean;
	};
}

export interface MdsyncCapabilityPayload {
	capabilities: MdsyncCapabilities;
	workspaceId: string;
}

export interface MdsyncCapabilityRotationPayload
	extends MdsyncCapabilityPayload {
	capability: "edit" | "read";
	links: {
		editUrl?: string;
		rawUrl?: string;
		workspaceUrl?: string;
	};
}

export interface MdsyncCapabilityRevocationPayload
	extends MdsyncCapabilityPayload {
	capability: "edit" | "read";
	revoked: true;
}

export interface MdsyncAdminStats {
	workspaceId: string;
	[key: string]: unknown;
}

export interface MdsyncAdminEvent {
	actor: string | null;
	createdAt?: string;
	path: string | null;
	payload: Record<string, unknown>;
	type: string;
}

export interface MdsyncWorkspaceExportBundle {
	adminEvents: MdsyncAdminEvent[];
	comments: Omit<MdsyncComment, "id" | "workspaceId">[];
	events: Omit<MdsyncWorkspaceEvent, "id" | "workspaceId">[];
	exportedAt?: string;
	files: Array<{
		content: string;
		contentType: string;
		createdAt: string;
		path: string;
		updatedAt: string;
		updatedBy: string | null;
		version: number;
	}>;
	fileVersions: Array<{
		content: string;
		contentType: string;
		createdAt: string;
		path: string;
		updatedBy: string | null;
		version: number;
	}>;
	format: string;
	retention?: unknown;
	schemaVersion: number;
	workspace: {
		createdAt?: string;
		id: string;
		readAccess?: "public" | "token";
		title?: string | null;
		totalSizeBytes?: number;
		updatedAt?: string;
		writeAccess?: "none" | "public" | "token";
		[key: string]: unknown;
	};
}

export interface MdsyncImportedWorkspace extends MdsyncCreatedWorkspace {
	importedAt?: string;
	importedCounts?: {
		adminEvents: number;
		comments: number;
		events: number;
		fileVersions: number;
		files: number;
	};
	sourceWorkspaceId?: string;
}

export interface MdsyncRetentionPolicy {
	retention: {
		[key: string]: unknown;
	};
	workspaceId: string;
}

export interface PruneRetentionInput {
	before: string;
	include?: {
		adminEvents?: boolean;
		events?: boolean;
		fileVersions?: boolean;
		resolvedComments?: boolean;
	};
	orphanedObjectKeys?: string[];
}

export interface MdsyncRetentionPruneResult {
	before?: string;
	pruned: Record<string, number>;
	skipped?: Record<string, number>;
	workspaceId: string;
}

export interface MdsyncLinkInput {
	path?: string;
	workspaceId?: string;
}

export interface CreateHostedHa2haClientInput {
	actor?: string;
	workspaceId?: string;
}

export interface MdsyncClient {
	createComment: (
		input: CreateCommentInput
	) => Promise<MdsyncResult<MdsyncComment>>;
	createHa2haClient: (
		input?: CreateHostedHa2haClientInput
	) => MdsyncResult<Ha2haClient>;
	createWorkspace: (
		input: CreateWorkspaceInput
	) => Promise<MdsyncResult<MdsyncCreatedWorkspace>>;
	deleteFile: (
		input: MdsyncDeleteFileInput
	) => Promise<MdsyncResult<MdsyncDeleteResult>>;
	editUrl: (input?: MdsyncLinkInput) => MdsyncResult<string>;
	exportWorkspace: () => Promise<MdsyncResult<MdsyncWorkspaceExportBundle>>;
	getAdminStats: () => Promise<MdsyncResult<MdsyncAdminStats>>;
	getCapabilities: () => Promise<MdsyncResult<MdsyncCapabilityPayload>>;
	getRetention: () => Promise<MdsyncResult<MdsyncRetentionPolicy>>;
	getWorkspace: () => Promise<MdsyncResult<MdsyncWorkspace>>;
	importWorkspace: (
		bundle: MdsyncWorkspaceExportBundle
	) => Promise<MdsyncResult<MdsyncImportedWorkspace>>;
	listComments: (
		input?: ListCommentsInput
	) => Promise<
		MdsyncResult<{ comments: MdsyncComment[]; workspaceId: string }>
	>;
	listEvents: () => Promise<
		MdsyncResult<{ events: MdsyncWorkspaceEvent[]; workspaceId: string }>
	>;
	listFiles: () => Promise<MdsyncResult<MdsyncWorkspaceListing>>;
	listFileVersions: (path: string) => Promise<
		MdsyncResult<{
			path: string;
			versions: MdsyncFileVersion[];
			workspaceId: string;
		}>
	>;
	pruneRetention: (
		input: PruneRetentionInput
	) => Promise<MdsyncResult<MdsyncRetentionPruneResult>>;
	rawUrl: (input?: MdsyncLinkInput) => MdsyncResult<string>;
	readFile: (path: string) => Promise<MdsyncResult<MdsyncFile>>;
	readFileVersion: (input: {
		path: string;
		version: number;
	}) => Promise<MdsyncResult<MdsyncFile>>;
	resolveComment: (
		input: ResolveCommentInput
	) => Promise<MdsyncResult<MdsyncComment>>;
	revokeCapability: (
		capability: "edit" | "read"
	) => Promise<MdsyncResult<MdsyncCapabilityRevocationPayload>>;
	rotateCapability: (
		capability: "edit" | "read"
	) => Promise<MdsyncResult<MdsyncCapabilityRotationPayload>>;
	workspaceUrl: (input?: MdsyncLinkInput) => MdsyncResult<string>;
	writeFile: (
		input: MdsyncWriteFileInput
	) => Promise<MdsyncResult<MdsyncWriteResult>>;
}

export type AuthRequirement = "edit" | "none" | "read";
