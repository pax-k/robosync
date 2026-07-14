import { z } from "zod";

import { HA2HA_EVIDENCE_RESULTS, HA2HA_TASK_STATES } from "./constants";
import {
	ha2haActorSchema,
	ha2haEvidenceMetadataSchema,
	ha2haParticipantFrontmatterSchema,
	ha2haTargetCoordinateSchema,
	ha2haTaskFrontmatterSchema,
	ha2haWorkspacePathSchema,
} from "./schemas";
import {
	HA2HA_V3_APPROVAL_DECISIONS,
	HA2HA_V3_AUTHORITY_GRANTS,
	HA2HA_V3_EVIDENCE_QUALITY_STATES,
	HA2HA_V3_FAILURE_CLASSES,
	HA2HA_V3_METHODS,
	HA2HA_V3_OPERATION_RECORD_MODE,
	HA2HA_V3_PARTICIPANT_KINDS,
	HA2HA_V3_PRINCIPAL_KINDS,
	HA2HA_V3_PROFILES,
	HA2HA_V3_PROVIDER_REFERENCE_TYPES,
	HA2HA_V3_REVIEW_SEVERITIES,
	HA2HA_V3_REVIEW_STATES,
	HA2HA_V3_ROLES,
} from "./v3-constants";

const ISO_TIMESTAMP_HINT_PATTERN = /^\d{4}-\d{2}-\d{2}T/u;
const SHA256_REFERENCE_PATTERN = /^sha256:[a-f0-9]{64}$/u;

const ha2haV3WorkspaceScopeSchema = z.string().trim().min(1);

export const ha2haV3ProfileSchema = z.enum(Object.values(HA2HA_V3_PROFILES));

export const ha2haV3MethodSchema = z.enum(Object.values(HA2HA_V3_METHODS));

export const ha2haV3FailureClassSchema = z.enum(HA2HA_V3_FAILURE_CLASSES);

export const ha2haV3TimestampSchema = z
	.string()
	.trim()
	.refine((value) => ISO_TIMESTAMP_HINT_PATTERN.test(value), {
		message: "Expected an ISO-like timestamp.",
	});

export const ha2haV3SelectorSchema = z
	.object({
		type: z.enum(["heading", "line", "range", "task", "artifact"]),
		value: z.union([z.string().trim().min(1), z.number().int().positive()]),
	})
	.strict();

export const ha2haV3ReviewTargetSchema = ha2haTargetCoordinateSchema.extend({
	selector: ha2haV3SelectorSchema.optional(),
});

export const ha2haV3AuthoritySchema = z
	.object({
		can_administer: z.boolean().optional(),
		can_approve: z.boolean().optional(),
		can_claim: z.boolean().optional(),
		can_deploy: z.boolean().optional(),
		can_publish: z.boolean().optional(),
		can_read: z.boolean().optional(),
		can_write: z.boolean().optional(),
	})
	.strict();

export const ha2haV3DelegationScopeSchema = z
	.object({
		max_effect: z.string().trim().min(1),
		methods: z.array(ha2haV3MethodSchema).optional(),
		paths: z.array(ha2haV3WorkspaceScopeSchema).min(1),
	})
	.passthrough();

export const ha2haV3ClaimSchema = z
	.object({
		claimed_at: ha2haV3TimestampSchema,
		lease_expires_at: ha2haV3TimestampSchema.optional(),
		participant: ha2haActorSchema,
	})
	.passthrough();

export const ha2haV3ReviewRequirementSchema = z
	.object({
		required: z.boolean(),
		reviewers: z.array(ha2haActorSchema).optional(),
	})
	.strict();

export const ha2haV3CheckReferenceSchema = z
	.object({
		evidence: ha2haWorkspacePathSchema.optional(),
		id: z.string().trim().min(1),
		recorded_at: ha2haV3TimestampSchema.optional(),
		result: z.enum(HA2HA_EVIDENCE_RESULTS),
		stale_at: ha2haV3TimestampSchema.optional(),
	})
	.strict();

export const ha2haV3TaskFrontmatterExtensionSchema = z
	.object({
		acceptance: z.array(z.string().trim().min(1)).optional(),
		approvals: z
			.array(z.union([z.string().trim().min(1), ha2haWorkspacePathSchema]))
			.optional(),
		blocked_by: z.array(z.string().trim().min(1)).optional(),
		branch: z.string().trim().min(1).optional(),
		checks: z.array(ha2haV3CheckReferenceSchema).optional(),
		claim: ha2haV3ClaimSchema.optional(),
		commits: z.array(z.string().trim().min(1)).optional(),
		depends_on: z.array(z.string().trim().min(1)).optional(),
		deployment: z.string().trim().min(1).nullable().optional(),
		handoffs: z.array(ha2haWorkspacePathSchema).optional(),
		issues: z.array(z.string().trim().min(1)).optional(),
		priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
		pull_requests: z
			.array(
				z
					.object({
						id: z.union([
							z.string().trim().min(1),
							z.number().int().positive(),
						]),
						provider: z.string().trim().min(1),
						url: z.string().url(),
					})
					.strict()
			)
			.optional(),
		repository: z.string().trim().min(1).optional(),
		review: ha2haV3ReviewRequirementSchema.optional(),
	})
	.strict();

export const ha2haV3TaskFrontmatterSchema = ha2haTaskFrontmatterSchema.and(
	ha2haV3TaskFrontmatterExtensionSchema
);

export const ha2haV3ParticipantFrontmatterExtensionSchema = z
	.object({
		authority: ha2haV3AuthoritySchema.optional(),
		delegated_by: ha2haActorSchema.optional(),
		delegation_scope: ha2haV3DelegationScopeSchema.optional(),
		kind: z.enum(HA2HA_V3_PARTICIPANT_KINDS).optional(),
		roles: z.array(z.enum(HA2HA_V3_ROLES)).optional(),
	})
	.strict();

export const ha2haV3ParticipantFrontmatterSchema =
	ha2haParticipantFrontmatterSchema.and(
		ha2haV3ParticipantFrontmatterExtensionSchema
	);

export const ha2haV3PrincipalSchema = z
	.object({
		displayName: z.string().trim().min(1).optional(),
		id: ha2haActorSchema,
		kind: z.enum(HA2HA_V3_PRINCIPAL_KINDS),
	})
	.strict();

export const ha2haV3AuthorityGrantSchema = z
	.object({
		expiresAt: ha2haV3TimestampSchema.optional(),
		grantedAt: ha2haV3TimestampSchema,
		grantedBy: ha2haActorSchema,
		grants: z.array(z.enum(HA2HA_V3_AUTHORITY_GRANTS)).min(1),
		id: z.string().trim().min(1),
		methods: z.array(ha2haV3MethodSchema).optional(),
		paths: z.array(ha2haV3WorkspaceScopeSchema).min(1),
		principal: ha2haActorSchema,
		revokedAt: ha2haV3TimestampSchema.optional(),
	})
	.strict();

export const ha2haV3MethodContractSchema = z
	.object({
		allowedPaths: z.array(z.string().trim().min(1)).min(1),
		blockingFailures: z.array(ha2haV3FailureClassSchema).min(1),
		conformance: z.array(z.string().trim().min(1)).min(1),
		emitsEvents: z.array(z.string().trim().min(1)),
		emitsEvidence: z.boolean(),
		failureClasses: z.array(ha2haV3FailureClassSchema).min(1),
		idempotency: z.enum(["required", "recommended", "not-required"]),
		inputSchema: z.string().trim().min(1),
		name: ha2haV3MethodSchema,
		outputSchema: z.string().trim().min(1),
		profile: ha2haV3ProfileSchema,
		purpose: z.string().trim().min(1),
		requiresActor: z.literal(true),
		requiresAuthority: z.array(z.enum(HA2HA_V3_AUTHORITY_GRANTS)).min(1),
		requiresBaseVersion: z.boolean(),
		retry: z.enum(["none", "once-on-version-conflict", "idempotent-only"]),
		stateTransitions: z.array(z.string().trim().min(1)),
	})
	.strict();

export const ha2haV3WorkspaceValidateRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		profiles: z.array(ha2haV3ProfileSchema).optional(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haV3TaskClaimRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive(),
		claim: ha2haV3ClaimSchema,
		path: ha2haWorkspacePathSchema,
	})
	.strict();

export const ha2haV3TaskHandoffRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive(),
		blockers: z.array(z.string().trim().min(1)),
		currentState: z.string().trim().min(1),
		evidence: z.array(ha2haWorkspacePathSchema),
		from: ha2haActorSchema,
		nextAction: z.string().trim().min(1),
		path: ha2haWorkspacePathSchema,
		summary: z.string().trim().min(1),
		to: ha2haActorSchema.optional(),
	})
	.strict();

export const ha2haV3EvidenceAddRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive().optional(),
		evidence: ha2haEvidenceMetadataSchema,
		path: ha2haWorkspacePathSchema,
	})
	.strict();

export const ha2haV3ReviewCommentRequestSchema = z
	.object({
		actor: ha2haActorSchema,
		baseVersion: z.number().int().positive().optional(),
		comment: z.string().trim().min(1),
		path: ha2haWorkspacePathSchema,
		target: ha2haV3ReviewTargetSchema,
	})
	.strict();

export const ha2haV3ValidationIssueSchema = z
	.object({
		expected: z.string().trim().min(1).optional(),
		message: z.string().trim().min(1),
		observed: z.string().trim().min(1).optional(),
		path: z.string().trim().min(1),
		profile: ha2haV3ProfileSchema.optional(),
		repairHint: z.string().trim().min(1).optional(),
		ruleId: z.string().trim().min(1),
		severity: z.enum(["error", "warning"]),
	})
	.strict();

export const ha2haV3ValidationOutputSchema = z
	.object({
		issues: z.array(ha2haV3ValidationIssueSchema),
		ok: z.boolean(),
		profiles: z.array(ha2haV3ProfileSchema),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haV3HandoffRecordSchema = z
	.object({
		blockers: z.array(z.string().trim().min(1)),
		created_at: ha2haV3TimestampSchema,
		current_state: z.string().trim().min(1),
		evidence: z.array(ha2haWorkspacePathSchema),
		from: ha2haActorSchema,
		id: z.string().trim().min(1),
		next_action: z.string().trim().min(1),
		summary: z.string().trim().min(1),
		task: z.string().trim().min(1),
		to: ha2haActorSchema.optional(),
	})
	.strict();

export const ha2haV3ReviewCommentRecordSchema = z
	.object({
		assigned_to: ha2haActorSchema.optional(),
		author: ha2haActorSchema,
		body: z.string().trim().min(1).optional(),
		created_at: ha2haV3TimestampSchema,
		id: z.string().trim().min(1),
		severity: z.enum(HA2HA_V3_REVIEW_SEVERITIES),
		state: z.enum(HA2HA_V3_REVIEW_STATES),
		target: ha2haV3ReviewTargetSchema,
	})
	.strict();

export const ha2haV3QuestionRecordSchema = z
	.object({
		asked_at: ha2haV3TimestampSchema,
		author: ha2haActorSchema,
		body: z.string().trim().min(1),
		id: z.string().trim().min(1),
		response: z
			.object({
				answered_at: ha2haV3TimestampSchema,
				author: ha2haActorSchema,
				body: z.string().trim().min(1),
			})
			.strict()
			.optional(),
		state: z.enum(["open", "answered"]),
		target: ha2haV3ReviewTargetSchema.optional(),
		task: z.string().trim().min(1).optional(),
	})
	.strict();

export const ha2haV3ApprovalRecordSchema = z
	.object({
		authority_basis: z.string().trim().min(1),
		created_at: ha2haV3TimestampSchema,
		decision: z.enum(HA2HA_V3_APPROVAL_DECISIONS),
		evidence: z.array(
			z.union([ha2haWorkspacePathSchema, z.string().trim().min(1)])
		),
		id: z.string().trim().min(1),
		principal: ha2haActorSchema,
		target: ha2haV3ReviewTargetSchema,
	})
	.strict();

export const ha2haV3ProofOfWorkRecordSchema =
	ha2haEvidenceMetadataSchema.safeExtend({
		authority: z
			.object({
				delegated_by: ha2haActorSchema.optional(),
				grant: z.string().trim().min(1),
			})
			.strict(),
		environment: z
			.object({
				cwd: z.string().trim().min(1).optional(),
				runtime: z.string().trim().min(1).optional(),
			})
			.strict()
			.optional(),
		hashes: z
			.record(
				ha2haWorkspacePathSchema,
				z.string().regex(SHA256_REFERENCE_PATTERN)
			)
			.optional(),
		quality: z.enum(HA2HA_V3_EVIDENCE_QUALITY_STATES).optional(),
	});

export const ha2haV3AuditEventSchema = z
	.object({
		actor: ha2haActorSchema,
		authorityBasis: z.string().trim().min(1),
		createdAt: ha2haV3TimestampSchema,
		id: z.string().trim().min(1),
		payload: z.record(z.string(), z.unknown()),
		principal: ha2haActorSchema,
		target: ha2haTargetCoordinateSchema,
		type: z.string().trim().min(1),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export const ha2haV3PolicyGateSchema = z
	.object({
		blocks: z.array(z.enum(HA2HA_TASK_STATES)).min(1),
		id: z.string().trim().min(1),
		requiredApprovals: z.number().int().nonnegative(),
		requiredChecks: z.array(z.string().trim().min(1)),
		requiredEvidenceKinds: z.array(z.string().trim().min(1)),
		scope: z.string().trim().min(1),
	})
	.strict();

export const ha2haV3RiskExceptionSchema = z
	.object({
		accepted_at: ha2haV3TimestampSchema,
		accepted_by: ha2haActorSchema,
		authority_basis: z.string().trim().min(1),
		expires_at: ha2haV3TimestampSchema.optional(),
		id: z.string().trim().min(1),
		reason: z.string().trim().min(1),
		target: ha2haV3ReviewTargetSchema,
	})
	.strict();

export const ha2haV3AuditExportSchema = z
	.object({
		createdAt: ha2haV3TimestampSchema,
		createdBy: ha2haActorSchema,
		includes: z
			.object({
				approvals: z.literal(true),
				auditEvents: z.literal(true),
				decisions: z.literal(true),
				evidence: z.literal(true),
				fileVersions: z.literal(true),
				profileRecords: z.literal(true),
				tasks: z.literal(true),
			})
			.strict(),
		manifestVersion: z.literal("v3-audit-export-1"),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

const providerReferenceBaseSchema = z
	.object({
		id: z.string().trim().min(1),
		provider: z.string().trim().min(1),
		type: z.enum(HA2HA_V3_PROVIDER_REFERENCE_TYPES),
		url: z.string().url().optional(),
	})
	.strict();

export const ha2haV3EngineeringSchema = z
	.object({
		checks: z
			.array(
				z
					.object({
						command: z.string().trim().min(1).optional(),
						id: z.string().trim().min(1),
						requiredFor: z.array(z.enum(["review", "done", "deploy"])).min(1),
					})
					.strict()
			)
			.optional(),
		deployments: z.array(providerReferenceBaseSchema).optional(),
		references: z.array(providerReferenceBaseSchema).optional(),
		repositories: z
			.array(
				z
					.object({
						defaultBranch: z.string().trim().min(1),
						id: z.string().trim().min(1),
						provider: z.string().trim().min(1),
						url: z.string().url(),
					})
					.strict()
			)
			.min(1),
	})
	.strict();

export const ha2haV3OperationRecordSchema = z
	.object({
		actor: ha2haActorSchema,
		createdAt: ha2haV3TimestampSchema,
		failure: ha2haV3FailureClassSchema.optional(),
		id: z.string().trim().min(1),
		method: ha2haV3MethodSchema,
		mode: z.literal(HA2HA_V3_OPERATION_RECORD_MODE),
		target: ha2haV3ReviewTargetSchema.optional(),
		workspaceId: z.string().trim().min(1),
	})
	.strict();

export type Ha2haV3Profile = z.infer<typeof ha2haV3ProfileSchema>;
export type Ha2haV3MethodContract = z.infer<typeof ha2haV3MethodContractSchema>;
export type Ha2haV3TaskFrontmatterExtension = z.infer<
	typeof ha2haV3TaskFrontmatterExtensionSchema
>;
export type Ha2haV3TaskFrontmatter = z.infer<
	typeof ha2haV3TaskFrontmatterSchema
>;
export type Ha2haV3ParticipantFrontmatterExtension = z.infer<
	typeof ha2haV3ParticipantFrontmatterExtensionSchema
>;
export type Ha2haV3ParticipantFrontmatter = z.infer<
	typeof ha2haV3ParticipantFrontmatterSchema
>;
export type Ha2haV3HandoffRecord = z.infer<typeof ha2haV3HandoffRecordSchema>;
export type Ha2haV3ReviewCommentRecord = z.infer<
	typeof ha2haV3ReviewCommentRecordSchema
>;
export type Ha2haV3ApprovalRecord = z.infer<typeof ha2haV3ApprovalRecordSchema>;
export type Ha2haV3AuditEvent = z.infer<typeof ha2haV3AuditEventSchema>;
export type Ha2haV3Engineering = z.infer<typeof ha2haV3EngineeringSchema>;
