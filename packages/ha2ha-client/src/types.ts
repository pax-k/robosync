import type {
	Ha2haEvidenceResult,
	Ha2haTargetCoordinate,
	Ha2haValidationResult,
} from "@ha2ha/protocol";

export type Ha2haClientErrorCode =
	| "invalid_request"
	| "not_found"
	| "partial_write"
	| "task_owned"
	| "transport_error"
	| "unsupported_operation"
	| "validation_error"
	| "version_conflict";

export interface Ha2haClientError {
	code: Ha2haClientErrorCode;
	latest?: Ha2haTargetCoordinate & {
		content?: string;
		contentType?: string;
		updatedAt?: string;
		updatedBy?: string | null;
	};
	message: string;
	partial?: {
		evidence?: Ha2haWriteResult;
		failedOperation: "link_task_evidence";
	};
	status?: number;
}

export type Ha2haResult<Data> =
	| { data: Data; ok: true }
	| { error: Ha2haClientError; ok: false };

export interface Ha2haFile {
	content: string;
	contentType: string;
	path: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface Ha2haWorkspaceListing {
	files: Array<{ path: string; version?: number }>;
	workspaceId: string;
}

export interface Ha2haWriteResult {
	path: string;
	updatedBy?: string | null;
	version: number;
	workspaceId: string;
}

export interface Ha2haDeleteResult {
	deleted: true;
	deletedBy?: string | null;
	path: string;
	workspaceId: string;
}

export interface Ha2haTransport {
	deleteFile: (
		input: TransportDeleteInput
	) => Promise<Ha2haResult<Ha2haDeleteResult>>;
	listWorkspace: () => Promise<Ha2haResult<Ha2haWorkspaceListing>>;
	readFile: (path: string) => Promise<Ha2haResult<Ha2haFile>>;
	validateWorkspace?: () => Promise<Ha2haResult<Ha2haValidationResult>>;
	writeFile: (
		input: TransportWriteInput
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}

export interface TransportWriteInput {
	actor: string;
	baseVersion?: number | null;
	content: string;
	contentType?: string;
	path: string;
}

export interface TransportDeleteInput {
	actor: string;
	baseVersion: number;
	path: string;
}

export interface CreateHa2haClientOptions {
	actor: string;
	clock?: () => Date;
	transport: Ha2haTransport;
}

export interface ClaimTaskInput {
	owner?: string;
	path?: string;
	state?: "claimed" | "working";
	taskId: string;
}

export interface AddEvidenceInput {
	body?: string;
	evidencePath?: string;
	id?: string;
	kind: string;
	result: Ha2haEvidenceResult;
	target?: Ha2haTargetCoordinate;
	taskId: string;
}

export interface RecordDecisionInput {
	body: string;
	path?: string;
	title: string;
}

export interface WriteHandoffInput {
	body: string;
	path?: string;
	taskId?: string;
}

export interface Ha2haClient {
	addEvidence: (
		input: AddEvidenceInput
	) => Promise<
		Ha2haResult<{ evidence: Ha2haWriteResult; task: Ha2haWriteResult }>
	>;
	claimTask: (input: ClaimTaskInput) => Promise<Ha2haResult<Ha2haWriteResult>>;
	deleteFile: (
		input: Omit<TransportDeleteInput, "actor">
	) => Promise<Ha2haResult<Ha2haDeleteResult>>;
	listWorkspace: () => Promise<Ha2haResult<Ha2haWorkspaceListing>>;
	readFile: (path: string) => Promise<Ha2haResult<Ha2haFile>>;
	recordDecision: (
		input: RecordDecisionInput
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
	validateWorkspace: () => Promise<Ha2haResult<Ha2haValidationResult>>;
	writeFile: (
		input: Omit<TransportWriteInput, "actor">
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
	writeHandoff: (
		input: WriteHandoffInput
	) => Promise<Ha2haResult<Ha2haWriteResult>>;
}
