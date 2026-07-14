import {
	type Ha2haWorkspaceManifest,
	ha2haWorkspaceManifestSchema,
} from "@ha2ha/protocol";
import { err, ok } from "./errors";
import type { MdsyncResult } from "./types";

const EXPECTED_PROTOCOL = "ha2ha";
const EXPECTED_PROTOCOL_VERSION = "1.0.0";
const EXPECTED_CONFLICT_POLICY = "baseVersion-required";

export function validateMdsyncHa2haManifest({
	content,
	workspaceId,
}: {
	content: string;
	workspaceId: string;
}): MdsyncResult<Ha2haWorkspaceManifest> {
	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(content);
	} catch {
		return err(
			"validation_error",
			"The MDSync HA2HA manifest is not valid JSON."
		);
	}

	const parsedManifest = ha2haWorkspaceManifestSchema.safeParse(parsedJson);
	if (!parsedManifest.success) {
		return err(
			"validation_error",
			"The MDSync HA2HA manifest does not match the protocol schema."
		);
	}

	const manifest = parsedManifest.data;
	if (manifest.protocol !== EXPECTED_PROTOCOL) {
		return err("validation_error", "The manifest protocol is not supported.");
	}
	if (manifest.protocolVersion !== EXPECTED_PROTOCOL_VERSION) {
		return err(
			"validation_error",
			`The manifest must use HA2HA protocol version ${EXPECTED_PROTOCOL_VERSION}.`
		);
	}
	if (manifest.conflictPolicy !== EXPECTED_CONFLICT_POLICY) {
		return err(
			"validation_error",
			`The manifest must use conflict policy ${EXPECTED_CONFLICT_POLICY}.`
		);
	}
	if (manifest.workspaceId !== workspaceId) {
		return err(
			"validation_error",
			"The manifest workspace ID does not match the connected workspace."
		);
	}

	return ok(manifest);
}
