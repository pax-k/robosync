import { z } from "zod";

import {
	HA2HA_CAPABILITIES,
	HA2HA_CONFLICT,
	HA2HA_CONFLICT_POLICIES,
	HA2HA_EVENT_TYPES,
	HA2HA_EVIDENCE_RESULTS,
	HA2HA_PATHS,
	HA2HA_PROTOCOL,
	HA2HA_TASK_STATES,
} from "./constants";

const DUPLICATE_SLASH_PATTERN = /\/{2,}/u;
const PARENT_SEGMENT_PATTERN = /(?:^|\/)\.\.(?:\/|$)/u;
const ROOT_OR_BACKSLASH_PATH_PATTERN = /^\/|\\/u;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;

export const isHa2haWorkspacePath = (path: string): boolean =>
	path.length > 0 &&
	path.trim() === path &&
	!ROOT_OR_BACKSLASH_PATH_PATTERN.test(path) &&
	!DUPLICATE_SLASH_PATTERN.test(path) &&
	!PARENT_SEGMENT_PATTERN.test(path);

export const ha2haWorkspacePathSchema = z
	.string()
	.refine(isHa2haWorkspacePath, {
		message: "Expected a normalized relative workspace path.",
	});

export const ha2haActorSchema = z.string().trim().min(1).max(120);

export const ha2haTaskStateSchema = z.enum(HA2HA_TASK_STATES);

export const ha2haCapabilitySchema = z.enum(Object.values(HA2HA_CAPABILITIES));

export const ha2haEvidenceResultSchema = z.enum(HA2HA_EVIDENCE_RESULTS);

export const ha2haEventTypeSchema = z.enum(Object.values(HA2HA_EVENT_TYPES));

export const ha2haTargetCoordinateSchema = z
	.object({
		path: ha2haWorkspacePathSchema,
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haWorkspaceManifestSchema = z
	.object({
		capabilities: z.array(ha2haCapabilitySchema),
		conflictPolicy: z.literal(HA2HA_CONFLICT_POLICIES.baseVersionRequired),
		paths: z
			.object({
				decisions: z.literal(HA2HA_PATHS.decisions),
				evidence: z.literal(HA2HA_PATHS.evidence),
				logs: z.literal(HA2HA_PATHS.logs),
				manifestMarkdown: z.literal(HA2HA_PATHS.manifestMarkdown),
				participants: z.literal(HA2HA_PATHS.participants),
				status: z.literal(HA2HA_PATHS.status),
				tasks: z.literal(HA2HA_PATHS.tasks),
				workspaceManifest: z.literal(HA2HA_PATHS.workspaceManifest),
			})
			.strict(),
		protocol: z.literal(HA2HA_PROTOCOL.name),
		protocolVersion: z.string().trim().min(1),
		routes: z
			.object({
				events: z.string().trim().min(1).optional(),
				file: z.string().trim().min(1).optional(),
				fileVersion: z.string().trim().min(1).optional(),
				fileVersions: z.string().trim().min(1).optional(),
				rawEvents: z.string().trim().min(1).optional(),
				rawFile: z.string().trim().min(1),
				rawListing: z.string().trim().min(1),
				tree: z.string().trim().min(1).optional(),
			})
			.strict(),
		schemaVersions: z.record(z.string(), z.string()).optional(),
		title: z.string().trim().min(1),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haTaskFrontmatterSchema = z
	.object({
		evidence: z.array(ha2haWorkspacePathSchema).optional(),
		id: z.string().trim().min(1),
		owner: z.string().trim().min(1).nullable().optional(),
		state: ha2haTaskStateSchema,
		title: z.string().trim().min(1),
		updated_by: ha2haActorSchema.optional(),
	})
	.strict();

export const ha2haParticipantFrontmatterSchema = z
	.object({
		agent_runtime: z.string().trim().min(1).optional(),
		can_edit: z.boolean().optional(),
		human: z.string().trim().min(1).optional(),
		id: z.string().trim().min(1),
		last_seen: z.string().trim().min(1).optional(),
	})
	.strict();

export const ha2haEvidenceMetadataSchema = z
	.object({
		actor: ha2haActorSchema,
		created_at: z.string().trim().min(1),
		id: z.string().trim().min(1),
		kind: z.string().trim().min(1),
		result: ha2haEvidenceResultSchema,
		target: ha2haTargetCoordinateSchema.optional(),
		task: z.string().trim().min(1).optional(),
	})
	.refine((metadata) => Boolean(metadata.task ?? metadata.target), {
		message: "Evidence must include task or target.",
		path: ["task"],
	})
	.strict();

export const ha2haFileUpdateRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive().nullable().optional(),
		content: z.string(),
		contentType: z.string().trim().min(1).optional(),
		path: ha2haWorkspacePathSchema,
	})
	.strict();

export const ha2haFileDeleteRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive(),
		path: ha2haWorkspacePathSchema,
	})
	.strict();

export const ha2haTaskClaimUpdateSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive(),
		next: z
			.object({
				owner: ha2haActorSchema,
				state: ha2haTaskStateSchema,
				updated_by: ha2haActorSchema,
			})
			.strict(),
		path: ha2haWorkspacePathSchema.refine(
			(path) => path.startsWith(HA2HA_PATHS.tasks),
			{
				message: "Task claims must target tasks/<id>.md.",
			}
		),
	})
	.strict();

export const ha2haWorkspaceEventSchema = z
	.object({
		actor: ha2haActorSchema,
		createdAt: z.string().trim().min(1),
		id: z.string().trim().min(1),
		path: ha2haWorkspacePathSchema,
		payload: z.record(z.string(), z.unknown()),
		type: ha2haEventTypeSchema,
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haWorkspaceFileVersionSchema = z
	.object({
		contentType: z.string().trim().min(1),
		createdAt: z.string().trim().min(1),
		path: ha2haWorkspacePathSchema,
		sha256: z.string().regex(SHA256_HEX_PATTERN),
		sizeBytes: z.number().int().nonnegative(),
		updatedBy: ha2haActorSchema,
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haConflictLatestSchema = z
	.object({
		content: z.string(),
		contentType: z.string().trim().min(1),
		path: ha2haWorkspacePathSchema,
		updatedAt: z.string().trim().min(1),
		updatedBy: ha2haActorSchema.nullable().optional(),
		version: z.number().int().positive(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haConflictResponseSchema = z
	.object({
		error: z.literal(HA2HA_CONFLICT.error),
		latest: ha2haConflictLatestSchema,
		message: z.string().trim().min(1),
	})
	.strict();

export type Ha2haWorkspaceManifest = z.infer<
	typeof ha2haWorkspaceManifestSchema
>;
export type Ha2haTaskFrontmatter = z.infer<typeof ha2haTaskFrontmatterSchema>;
export type Ha2haParticipantFrontmatter = z.infer<
	typeof ha2haParticipantFrontmatterSchema
>;
export type Ha2haEvidenceMetadata = z.infer<typeof ha2haEvidenceMetadataSchema>;
export type Ha2haFileUpdateRequest = z.infer<
	typeof ha2haFileUpdateRequestSchema
>;
export type Ha2haFileDeleteRequest = z.infer<
	typeof ha2haFileDeleteRequestSchema
>;
export type Ha2haTaskClaimUpdate = z.infer<typeof ha2haTaskClaimUpdateSchema>;
export type Ha2haWorkspaceEvent = z.infer<typeof ha2haWorkspaceEventSchema>;
export type Ha2haWorkspaceFileVersion = z.infer<
	typeof ha2haWorkspaceFileVersionSchema
>;
export type Ha2haConflictResponse = z.infer<typeof ha2haConflictResponseSchema>;
