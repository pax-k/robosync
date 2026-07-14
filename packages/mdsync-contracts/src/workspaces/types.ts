import type { z } from "zod";
import type {
	workspaceActivityItemSchema,
	workspaceActivityResponseSchema,
	workspaceActivitySourceSchema,
} from "./activity";
import type {
	workspaceAdminEventSchema,
	workspaceAdminStatsSchema,
	workspaceNamedCountSchema,
	workspaceProtocolEventSummarySchema,
} from "./admin";
import type {
	workspaceReadAccessSchema,
	workspaceWriteAccessSchema,
} from "./base";
import type {
	workspaceCapabilitiesResponseSchema,
	workspaceCapabilitiesSchema,
	workspaceCapabilityKindSchema,
	workspaceCapabilityMutationResponseSchema,
} from "./capabilities";
import type {
	createWorkspaceCommentRequestSchema,
	resolveWorkspaceCommentRequestSchema,
	workspaceCommentSchema,
	workspaceCommentsResponseSchema,
} from "./comments";
import type { workspaceVersionConflictResponseSchema } from "./conflicts";
import type { mdsyncDiscoveryResponseSchema } from "./discovery";
import type {
	workspaceEventSchema,
	workspaceEventsResponseSchema,
} from "./events";
import type {
	createdWorkspaceResponseSchema,
	createWorkspaceRequestSchema,
	deleteWorkspaceFileRequestSchema,
	historicalWorkspaceFileResponseSchema,
	updateWorkspaceFileRequestSchema,
	workspaceFileDeleteResponseSchema,
	workspaceFileResponseSchema,
	workspaceFileVersionMetadataSchema,
	workspaceFileVersionsResponseSchema,
	workspaceFileWriteResponseSchema,
	workspaceMetadataSchema,
	workspaceTreeFileSchema,
	workspaceTreeResponseSchema,
} from "./files";
import type {
	importedWorkspaceResponseSchema,
	workspaceExportBundleSchema,
} from "./import-export";
import type {
	workspaceOverviewResponseSchema,
	workspaceOverviewTaskStateSchema,
} from "./overview";
import type {
	workspaceRetentionPolicyResponseSchema,
	workspaceRetentionPruneRequestSchema,
	workspaceRetentionPruneResponseSchema,
} from "./retention";

export type WorkspaceReadAccess = z.infer<typeof workspaceReadAccessSchema>;
export type WorkspaceActivitySource = z.infer<
	typeof workspaceActivitySourceSchema
>;
export type WorkspaceActivityItem = z.infer<typeof workspaceActivityItemSchema>;
export type WorkspaceActivityResponse = z.infer<
	typeof workspaceActivityResponseSchema
>;
export type WorkspaceWriteAccess = z.infer<typeof workspaceWriteAccessSchema>;
export type WorkspaceCapabilityKind = z.infer<
	typeof workspaceCapabilityKindSchema
>;
export type CreateWorkspaceRequest = z.infer<
	typeof createWorkspaceRequestSchema
>;
export type UpdateWorkspaceFileRequest = z.infer<
	typeof updateWorkspaceFileRequestSchema
>;
export type DeleteWorkspaceFileRequest = z.infer<
	typeof deleteWorkspaceFileRequestSchema
>;
export type CreateWorkspaceCommentRequest = z.infer<
	typeof createWorkspaceCommentRequestSchema
>;
export type ResolveWorkspaceCommentRequest = z.infer<
	typeof resolveWorkspaceCommentRequestSchema
>;
export type WorkspaceRetentionPruneRequest = z.infer<
	typeof workspaceRetentionPruneRequestSchema
>;
export type WorkspaceMetadata = z.infer<typeof workspaceMetadataSchema>;
export type CreatedWorkspaceResponse = z.infer<
	typeof createdWorkspaceResponseSchema
>;
export type WorkspaceTreeFile = z.infer<typeof workspaceTreeFileSchema>;
export type WorkspaceTreeResponse = z.infer<typeof workspaceTreeResponseSchema>;
export type WorkspaceFileResponse = z.infer<typeof workspaceFileResponseSchema>;
export type WorkspaceFileWriteResponse = z.infer<
	typeof workspaceFileWriteResponseSchema
>;
export type WorkspaceFileDeleteResponse = z.infer<
	typeof workspaceFileDeleteResponseSchema
>;
export type WorkspaceFileVersionMetadata = z.infer<
	typeof workspaceFileVersionMetadataSchema
>;
export type HistoricalWorkspaceFileResponse = z.infer<
	typeof historicalWorkspaceFileResponseSchema
>;
export type WorkspaceEvent = z.infer<typeof workspaceEventSchema>;
export type WorkspaceEventsResponse = z.infer<
	typeof workspaceEventsResponseSchema
>;
export type WorkspaceComment = z.infer<typeof workspaceCommentSchema>;
export type WorkspaceCommentsResponse = z.infer<
	typeof workspaceCommentsResponseSchema
>;
export type WorkspaceFileVersionsResponse = z.infer<
	typeof workspaceFileVersionsResponseSchema
>;
export type WorkspaceCapabilities = z.infer<typeof workspaceCapabilitiesSchema>;
export type WorkspaceCapabilitiesResponse = z.infer<
	typeof workspaceCapabilitiesResponseSchema
>;
export type WorkspaceCapabilityMutationResponse = z.infer<
	typeof workspaceCapabilityMutationResponseSchema
>;
export type WorkspaceAdminStats = z.infer<typeof workspaceAdminStatsSchema>;
export type WorkspaceAdminEvent = z.infer<typeof workspaceAdminEventSchema>;
export type WorkspaceProtocolEventSummary = z.infer<
	typeof workspaceProtocolEventSummarySchema
>;
export type WorkspaceNamedCount = z.infer<typeof workspaceNamedCountSchema>;
export type WorkspaceExportBundle = z.infer<typeof workspaceExportBundleSchema>;
export type ImportedWorkspaceResponse = z.infer<
	typeof importedWorkspaceResponseSchema
>;
export type WorkspaceRetentionPolicyResponse = z.infer<
	typeof workspaceRetentionPolicyResponseSchema
>;
export type WorkspaceRetentionPruneResponse = z.infer<
	typeof workspaceRetentionPruneResponseSchema
>;
export type WorkspaceVersionConflictResponse = z.infer<
	typeof workspaceVersionConflictResponseSchema
>;
export type MdsyncDiscoveryResponse = z.infer<
	typeof mdsyncDiscoveryResponseSchema
>;
export type WorkspaceOverviewResponse = z.infer<
	typeof workspaceOverviewResponseSchema
>;
export type WorkspaceOverviewTaskState = z.infer<
	typeof workspaceOverviewTaskStateSchema
>;
