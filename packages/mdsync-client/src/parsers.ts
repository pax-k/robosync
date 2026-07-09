import {
	createdWorkspaceResponseSchema,
	historicalWorkspaceFileResponseSchema,
	importedWorkspaceResponseSchema,
	workspaceCapabilitiesResponseSchema,
	workspaceCapabilityMutationResponseSchema,
	workspaceCommentSchema,
	workspaceExportBundleSchema,
	workspaceFileDeleteResponseSchema,
	workspaceFileResponseSchema,
	workspaceFileWriteResponseSchema,
	workspaceMetadataSchema,
	workspaceRetentionPolicyResponseSchema,
	workspaceRetentionPruneResponseSchema,
	workspaceTreeResponseSchema,
} from "@mdsync/contracts/workspaces";
import { ZodError } from "zod";
import { err, getRecord, getString, ok } from "./errors";
import type {
	MdsyncAdminStats,
	MdsyncCapabilityPayload,
	MdsyncCapabilityRevocationPayload,
	MdsyncCapabilityRotationPayload,
	MdsyncComment,
	MdsyncCreatedWorkspace,
	MdsyncDeleteResult,
	MdsyncFile,
	MdsyncImportedWorkspace,
	MdsyncResult,
	MdsyncRetentionPolicy,
	MdsyncRetentionPruneResult,
	MdsyncWorkspace,
	MdsyncWorkspaceExportBundle,
	MdsyncWorkspaceListing,
	MdsyncWriteResult,
} from "./types";

export const parseCreatedWorkspace = (
	value: unknown
): MdsyncCreatedWorkspace => ({
	...createdWorkspaceResponseSchema.parse(value),
});

export const parseImportedWorkspace = (
	value: unknown
): MdsyncImportedWorkspace => importedWorkspaceResponseSchema.parse(value);

export const parseWorkspace = (value: unknown): MdsyncWorkspace => ({
	...workspaceMetadataSchema.parse(value),
});

export const parseWorkspaceListing = (
	value: unknown
): MdsyncWorkspaceListing => ({
	...workspaceTreeResponseSchema.parse(value),
});

export const parseFile = (value: unknown): MdsyncFile => ({
	...workspaceFileResponseSchema.parse(value),
});

export const parseWriteResult = (value: unknown): MdsyncWriteResult => ({
	...workspaceFileWriteResponseSchema.parse(value),
});

export const parseDeleteResult = (value: unknown): MdsyncDeleteResult => ({
	...workspaceFileDeleteResponseSchema.parse(value),
});

export const parseComment = (value: unknown): MdsyncComment => ({
	...workspaceCommentSchema.parse(value),
});

export const parseHistoricalFile = (value: unknown): MdsyncFile =>
	historicalWorkspaceFileResponseSchema.parse(value) as MdsyncFile;

export const parseCapabilityPayload = (
	value: unknown
): MdsyncCapabilityPayload => ({
	...workspaceCapabilitiesResponseSchema.parse(value),
});

export const parseCapabilityRotationPayload = (
	value: unknown
): MdsyncCapabilityRotationPayload => {
	const payload = workspaceCapabilityMutationResponseSchema.parse(value);
	if (!payload.links) {
		throw new Error("Capability rotation response is missing links.");
	}
	return {
		...payload,
		links: payload.links,
	};
};

export const parseCapabilityRevocationPayload = (
	value: unknown
): MdsyncCapabilityRevocationPayload => {
	const payload = workspaceCapabilityMutationResponseSchema.parse(value);
	if (payload.revoked !== true) {
		throw new Error("Capability revocation response is missing revoked=true.");
	}
	return {
		...payload,
		revoked: true,
	};
};

export const parseAdminStats = (value: unknown): MdsyncAdminStats => ({
	...getRecord(value),
	workspaceId: getString(value, "workspaceId", ""),
});

export const parseExportBundle = (
	value: unknown
): MdsyncWorkspaceExportBundle =>
	workspaceExportBundleSchema.parse(value) as MdsyncWorkspaceExportBundle;

export const parseRetentionPolicy = (
	value: unknown
): MdsyncRetentionPolicy => ({
	...workspaceRetentionPolicyResponseSchema.parse(value),
});

export const parseRetentionPruneResult = (
	value: unknown
): MdsyncRetentionPruneResult => ({
	...workspaceRetentionPruneResponseSchema.parse(value),
});

export const parseJsonPayload = <Data>(
	parse: (value: unknown) => Data,
	value: unknown
): MdsyncResult<Data> => {
	try {
		return ok(parse(value));
	} catch (error) {
		if (error instanceof ZodError) {
			return err("validation_error", formatZodError(error));
		}
		throw error;
	}
};

const formatZodError = (error: ZodError) =>
	`MDSync response validation failed: ${error.issues
		.map((issue) => issue.path.join(".") || "<root>")
		.join(", ")}`;
